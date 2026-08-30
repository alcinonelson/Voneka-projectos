import bcrypt from 'bcryptjs';
import { and, eq, isNull, lt, or } from 'drizzle-orm';
import type {
  AceitarConviteInput,
  AlterarPasswordInput,
  LoginInput,
  PedirRecuperacaoInput,
  ReporPasswordInput,
} from '@nexora/shared';
import { BCRYPT_ROUNDS, env } from '../../config/env';
import { db } from '../../db/db';
import { organizations } from '../../db/schema/organizations.schema';
import { refreshTokens, users } from '../../db/schema/users.schema';
import { erros } from '../../utils/errors';
import { logModulo, logger } from '../../utils/logger';
import { enviarEmail, textoRecuperacao } from '../../utils/mailer';
import {
  assinarAccessToken,
  gerarRefreshToken,
  gerarTokenConvite,
  hashOpaco,
  type Sessao,
} from '../../utils/tokens';

export interface UtilizadorSessao {
  id: string;
  nome: string;
  email: string;
  funcao: string;
  departamentoId: string | null;
  nivelAcesso: Sessao['nivel'];
  /** Empresa a que a conta pertence, com o que o interface precisa para se identificar. */
  empresa: {
    id: string;
    nome: string;
    moeda: string;
    inicialLogotipo: string | null;
    corMarca: string;
  };
}

export interface ResultadoAutenticacao {
  utilizador: UtilizadorSessao;
  accessToken: string;
  refreshToken: string;
}

/**
 * Hash de uma palavra-passe que nunca corresponde a nada.
 * Serve para gastar o mesmo tempo de bcrypt quando a conta nao existe.
 */
const HASH_INEXISTENTE = '$2a$12$0000000000000000000000000000000000000000000000000000';

/**
 * Junta a conta a empresa a que pertence.
 *
 * A empresa acompanha a sessao desde o primeiro momento porque tudo o que vem a seguir depende
 * dela: o token e assinado com ela, o interface identifica-se com ela e todas as consultas a
 * usam como fronteira. Uma conta cuja empresa desapareceu nao tem sessao possivel.
 */
async function comEmpresa(u: {
  id: string;
  organizationId: string;
  nome: string;
  email: string;
  funcao: string;
  departamentoId: string | null;
  nivelAcesso: Sessao['nivel'];
}): Promise<UtilizadorSessao> {
  const [empresa] = await db
    .select({
      id: organizations.id,
      nome: organizations.nome,
      moeda: organizations.moeda,
      inicialLogotipo: organizations.inicialLogotipo,
      corMarca: organizations.corMarca,
    })
    .from(organizations)
    .where(eq(organizations.id, u.organizationId))
    .limit(1);

  if (!empresa) throw erros.naoAutenticado('A empresa desta conta já não existe.');

  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    funcao: u.funcao,
    departamentoId: u.departamentoId,
    nivelAcesso: u.nivelAcesso,
    empresa,
  };
}

async function emitirSessao(
  u: UtilizadorSessao,
  userAgent?: string,
): Promise<ResultadoAutenticacao> {
  const { token, hash } = gerarRefreshToken();
  const expiraEm = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DIAS * 86_400_000);

  await db.insert(refreshTokens).values({
    userId: u.id,
    tokenHash: hash,
    expiraEm,
    userAgent: userAgent?.slice(0, 255) ?? null,
  });

  return {
    utilizador: u,
    accessToken: assinarAccessToken({
      sub: u.id,
      nivel: u.nivelAcesso,
      nome: u.nome,
      org: u.empresa.id,
    }),
    refreshToken: token,
  };
}

/**
 * Inicia sessao.
 *
 * A mensagem de erro e a mesma para email inexistente e para palavra-passe errada, e a comparacao
 * bcrypt corre mesmo quando a conta nao existe. Sem isso, o tempo de resposta diria a quem
 * tentasse quais os emails registados.
 */
export async function entrar(dados: LoginInput, userAgent?: string): Promise<ResultadoAutenticacao> {
  const [utilizador] = await db.select().from(users).where(eq(users.email, dados.email)).limit(1);

  const correcta = await bcrypt.compare(
    dados.password,
    utilizador?.passwordHash ?? HASH_INEXISTENTE,
  );

  if (!utilizador || !utilizador.passwordHash || !correcta) {
    throw erros.credenciaisInvalidas();
  }

  if (!utilizador.activo) {
    throw erros.semPermissao('Esta conta está desactivada. Contacte a Direcção.');
  }

  if (utilizador.estado === 'convite_pendente') {
    throw erros.semPermissao('O convite ainda não foi aceite. Verifique o seu email.');
  }

  await db.update(users).set({ ultimoLoginEm: new Date() }).where(eq(users.id, utilizador.id));
  logger.info(logModulo('auth', `Sessao iniciada por ${utilizador.id}`));

  return emitirSessao(await comEmpresa(utilizador), userAgent);
}

/**
 * Roda o refresh token.
 *
 * O token antigo e revogado no mesmo passo em que o novo e emitido. Se chegar um token ja rodado
 * ou inexistente, todas as sessoes da conta sao revogadas: e o sinal de que uma copia andou por
 * onde nao devia, e nesse caso vale mais obrigar toda a gente a entrar de novo.
 */
export async function renovar(token: string, userAgent?: string): Promise<ResultadoAutenticacao> {
  const [guardado] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, hashOpaco(token)))
    .limit(1);

  if (!guardado) throw erros.sessaoExpirada();

  if (guardado.revogadoEm || guardado.expiraEm.getTime() < Date.now()) {
    await revogarTodas(guardado.userId);
    logger.warn(
      logModulo(
        'auth',
        `Refresh token reutilizado ou expirado; sessoes revogadas para ${guardado.userId}`,
      ),
    );
    throw erros.sessaoExpirada();
  }

  const [utilizador] = await db.select().from(users).where(eq(users.id, guardado.userId)).limit(1);
  if (!utilizador || !utilizador.activo) throw erros.sessaoExpirada();

  await db
    .update(refreshTokens)
    .set({ revogadoEm: new Date() })
    .where(eq(refreshTokens.id, guardado.id));

  return emitirSessao(await comEmpresa(utilizador), userAgent);
}

/** Termina a sessao actual. Nao falha se o token ja nao existir: sair tem de ser sempre possivel. */
export async function sair(token: string | undefined): Promise<void> {
  if (!token) return;
  await db
    .update(refreshTokens)
    .set({ revogadoEm: new Date() })
    .where(and(eq(refreshTokens.tokenHash, hashOpaco(token)), isNull(refreshTokens.revogadoEm)));
}

/**
 * Revoga as sessoes por suspeita: marca-as, deixando o rasto de que existiram.
 * Uma sessao marcada e uma armadilha - se alguem a apresentar, `renovar` sabe que uma copia andou
 * por onde nao devia e derruba tudo outra vez.
 */
export async function revogarTodas(userId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revogadoEm: new Date() })
    .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revogadoEm)));
}

/**
 * Apaga as sessoes de uma conta.
 *
 * Usado quando a queda das sessoes e **intencional** - uma mudanca de palavra-passe - e nao um
 * sinal de roubo. A diferenca face a `revogarTodas` importa: um token marcado como revogado e uma
 * armadilha, e o dispositivo que ainda tem o cookie antigo iria arma-la ao tentar renovar,
 * derrubando tambem a sessao acabada de criar. Apagado, o cookie antigo apenas nao encontra nada
 * e expira em silencio, que e o que deve acontecer a quem foi legitimamente desligado.
 */
export async function removerSessoes(userId: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}

/** Aceita um convite e define a palavra-passe, activando a conta. */
export async function aceitarConvite(
  dados: AceitarConviteInput,
  userAgent?: string,
): Promise<ResultadoAutenticacao> {
  const [utilizador] = await db
    .select()
    .from(users)
    .where(eq(users.conviteTokenHash, hashOpaco(dados.token)))
    .limit(1);

  if (!utilizador) throw erros.conviteInvalido();
  if (!utilizador.conviteExpiraEm || utilizador.conviteExpiraEm.getTime() < Date.now()) {
    throw erros.conviteInvalido('O convite expirou. Peça à Direcção que o reenvie.');
  }

  const passwordHash = await bcrypt.hash(dados.password, BCRYPT_ROUNDS);

  const [actualizado] = await db
    .update(users)
    .set({
      passwordHash,
      estado: 'activo',
      conviteTokenHash: null,
      conviteExpiraEm: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, utilizador.id))
    .returning();

  if (!actualizado) throw erros.interno();
  logger.info(logModulo('auth', `Convite aceite por ${actualizado.id}`));

  return emitirSessao(await comEmpresa(actualizado), userAgent);
}

/**
 * Altera a palavra-passe da conta com sessao aberta.
 *
 * Exige a actual mesmo havendo sessao valida: um terminal deixado aberto nao pode ser suficiente
 * para tomar a conta de alguem.
 *
 * Ao gravar, **todas** as sessoes sao terminadas e e emitida uma nova para este dispositivo. Se a
 * palavra-passe estava comprometida, deixar as outras sessoes vivas tornaria a mudanca inutil -
 * quem tivesse uma continuava dentro. Quem esta a mudar continua a trabalhar sem voltar a entrar;
 * os outros dispositivos caem.
 */
export async function alterarPassword(
  sessao: Sessao,
  dados: AlterarPasswordInput,
  userAgent?: string,
): Promise<ResultadoAutenticacao> {
  const [utilizador] = await db.select().from(users).where(eq(users.id, sessao.sub)).limit(1);
  if (!utilizador || !utilizador.activo) throw erros.naoAutenticado();

  // Uma conta sem palavra-passe e uma conta cujo convite nunca foi aceite: o caminho e o convite.
  if (!utilizador.passwordHash) {
    throw erros.semPermissao('Esta conta ainda não tem palavra-passe definida. Use o convite.');
  }

  const correcta = await bcrypt.compare(dados.actual, utilizador.passwordHash);
  if (!correcta) {
    throw erros.validacao('A palavra-passe actual não está correcta.', {
      actual: 'Não corresponde à palavra-passe desta conta.',
    });
  }

  const igual = await bcrypt.compare(dados.nova, utilizador.passwordHash);
  if (igual) {
    throw erros.validacao('A nova palavra-passe é igual à actual.', {
      nova: 'Escolha uma palavra-passe diferente da actual.',
    });
  }

  const passwordHash = await bcrypt.hash(dados.nova, BCRYPT_ROUNDS);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, utilizador.id));

  // Apagar e nao marcar: ver `removerSessoes`. Marcar deixaria o cookie antigo de outro
  // dispositivo a armar a deteccao de reutilizacao e a derrubar a sessao criada aqui em baixo.
  await removerSessoes(utilizador.id);
  logger.info(
    logModulo('auth', `Palavra-passe alterada por ${utilizador.id}; sessoes terminadas`),
  );

  return emitirSessao(await comEmpresa(utilizador), userAgent);
}

export const MENSAGEM_RECUPERACAO =
  'Se existir uma conta activa com este email, enviámos uma ligação. Expira dentro de uma hora.';

/**
 * Pede uma ligacao para definir palavra-passe nova.
 *
 * A resposta e sempre a mesma, exista ou nao a conta: dizer "esse email nao esta registado"
 * denunciaria quem tem conta. So contas activas recebem a mensagem; um convite pendente continua
 * a resolver-se pelo convite, nao por aqui.
 */
export async function pedirRecuperacao(dados: PedirRecuperacaoInput): Promise<void> {
  const [utilizador] = await db
    .select()
    .from(users)
    .where(eq(users.email, dados.email))
    .limit(1);

  if (utilizador && utilizador.activo && utilizador.estado === 'activo' && utilizador.passwordHash) {
    const { token, hash } = gerarTokenConvite();
    const expiraEm = new Date(Date.now() + 60 * 60 * 1000);

    await db
      .update(users)
      .set({
        recuperacaoTokenHash: hash,
        recuperacaoExpiraEm: expiraEm,
        updatedAt: new Date(),
      })
      .where(eq(users.id, utilizador.id));

    const ligacao = `${env.WEB_ORIGIN}/recuperar?token=${token}`;
    await enviarEmail({
      para: utilizador.email,
      assunto: 'Nova palavra-passe no Voneka Projectos',
      texto: textoRecuperacao(utilizador.nome, ligacao),
    });
  }

  logger.info(logModulo('auth', `Pedido de recuperacao para ${dados.email}`));
}

/**
 * Define uma palavra-passe nova a partir da ligacao de recuperacao.
 *
 * Termina as sessoes antigas: se a pessoa pediu recuperacao, as sessoes que ainda andavam
 * por ai deixam de ser de confianca.
 */
export async function reporPassword(
  dados: ReporPasswordInput,
  userAgent?: string,
): Promise<ResultadoAutenticacao> {
  const [utilizador] = await db
    .select()
    .from(users)
    .where(eq(users.recuperacaoTokenHash, hashOpaco(dados.token)))
    .limit(1);

  if (!utilizador || !utilizador.activo) {
    throw erros.conviteInvalido('Esta ligação já não serve. Peça outra a partir da página de entrada.');
  }
  if (!utilizador.recuperacaoExpiraEm || utilizador.recuperacaoExpiraEm.getTime() < Date.now()) {
    throw erros.conviteInvalido('A ligação expirou. Peça outra a partir da página de entrada.');
  }

  const passwordHash = await bcrypt.hash(dados.password, BCRYPT_ROUNDS);

  const [actualizado] = await db
    .update(users)
    .set({
      passwordHash,
      recuperacaoTokenHash: null,
      recuperacaoExpiraEm: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, utilizador.id))
    .returning();

  if (!actualizado) throw erros.interno();

  await removerSessoes(utilizador.id);
  logger.info(logModulo('auth', `Palavra-passe reposta por ${utilizador.id}`));

  return emitirSessao(await comEmpresa(actualizado), userAgent);
}

/** Perfil da sessao actual. */
export async function perfil(userId: string): Promise<UtilizadorSessao> {
  const [utilizador] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!utilizador || !utilizador.activo) throw erros.naoAutenticado();
  return comEmpresa(utilizador);
}

/** Remove sessoes expiradas ou revogadas ha mais de um dia. */
export async function limparSessoes(): Promise<number> {
  const ontem = new Date(Date.now() - 86_400_000);
  const removidas = await db
    .delete(refreshTokens)
    .where(or(lt(refreshTokens.expiraEm, new Date()), lt(refreshTokens.revogadoEm, ontem)))
    .returning({ id: refreshTokens.id });
  return removidas.length;
}
