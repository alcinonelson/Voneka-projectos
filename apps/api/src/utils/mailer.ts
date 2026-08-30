import nodemailer from 'nodemailer';
import { env, temEmail } from '../config/env';
import { logModulo, logger } from './logger';

/**
 * Envio de email.
 *
 * Sem SMTP configurado, a mensagem e registada no log em vez de falhar. Assim o convite de um
 * membro continua a funcionar em desenvolvimento, e a ligacao aparece na consola para ser usada.
 */
const transporte = temEmail
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;

export interface Mensagem {
  para: string;
  assunto: string;
  texto: string;
}

export async function enviarEmail(mensagem: Mensagem): Promise<void> {
  if (!transporte) {
    logger.info(
      logModulo('email', `Sem SMTP configurado. Para ${mensagem.para}: ${mensagem.assunto}`),
    );
    logger.info(logModulo('email', mensagem.texto));
    return;
  }

  try {
    await transporte.sendMail({
      from: env.SMTP_FROM,
      to: mensagem.para,
      subject: mensagem.assunto,
      text: mensagem.texto,
    });
  } catch (erro) {
    // Um email que nao sai nao pode derrubar a operacao que o gerou.
    logger.error(
      logModulo('email', `Falha ao enviar para ${mensagem.para}: ${(erro as Error).message}`),
    );
  }
}

/** Corpo do convite de um novo membro. */
export function textoConvite(nome: string, ligacao: string, dias: number): string {
  return [
    `Bom dia ${nome},`,
    '',
    'Foi criada uma conta sua no Voneka Projectos.',
    'Defina a sua palavra-passe através da ligação abaixo:',
    '',
    ligacao,
    '',
    `A ligação expira dentro de ${dias} dias.`,
    '',
    'Voneka Projectos',
  ].join('\n');
}

/** Corpo de um alerta de prazo. */
export function textoAlerta(
  nome: string,
  titulo: string,
  estado: string,
  projecto: string,
): string {
  return [
    `Bom dia ${nome},`,
    '',
    `${estado}: ${titulo}`,
    `Projecto: ${projecto}`,
    '',
    'Ao concluir a tarefa é obrigatório escrever o mini relatório da situação.',
    '',
    'Voneka Projectos',
  ].join('\n');
}
