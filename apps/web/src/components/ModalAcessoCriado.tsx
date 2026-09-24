import { useEffect, useState } from 'react';
import type { AcessoEmitido } from '@nexora/shared';
import { formatarData } from '@nexora/shared';
import { COR, FONTE, PESO, RAIO, botaoSecundario, numerico, rotuloCampo } from '../design/tokens';
import { Modal } from './Modal';

/**
 * O que o Administrador entrega a pessoa: a ligacao de convite ou a palavra-passe temporaria.
 *
 * So existe nesta resposta. Na base de dados fica apenas o hash, e por isso este ecra diz com
 * todas as letras que fechar sem copiar obriga a gerar outra.
 *
 * A mensagem pronta existe porque o caminho real, enquanto nao ha email, e o WhatsApp: quem a
 * recebe precisa do endereco do portal, do email com que entra e do que fazer a seguir, e nao
 * apenas de uma sequencia de caracteres solta.
 */
export function ModalAcessoCriado({
  acesso,
  nome,
  onFechar,
}: {
  acesso: AcessoEmitido | null;
  nome: string;
  onFechar: () => void;
}) {
  const [copiado, setCopiado] = useState<'valor' | 'mensagem' | null>(null);

  useEffect(() => setCopiado(null), [acesso]);

  const ehPassword = Boolean(acesso?.password);
  const valor = acesso?.password ?? acesso?.ligacao ?? '';
  const primeiroNome = nome.split(' ')[0] ?? nome;
  const validade = acesso?.expiraEm ? formatarData(new Date(acesso.expiraEm)) : null;

  const mensagem = !acesso
    ? ''
    : ehPassword
      ? [
          `Olá ${primeiroNome}, a sua conta no Voneka Projectos está pronta.`,
          '',
          `Endereço: ${window.location.origin}/entrar`,
          `Email: ${acesso.email}`,
          `Palavra-passe temporária: ${acesso.password}`,
          '',
          'No primeiro acesso vai escolher uma palavra-passe sua.',
        ].join('\n')
      : [
          `Olá ${primeiroNome}, foi criada a sua conta no Voneka Projectos.`,
          '',
          'Defina a sua palavra-passe por esta ligação:',
          acesso.ligacao,
          '',
          validade ? `A ligação vale até ${validade}. Depois disso entra com o email ${acesso.email}.` : '',
        ].join('\n');

  async function copiar(texto: string, qual: 'valor' | 'mensagem') {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(qual);
    } catch {
      // Sem permissao de area de transferencia (http, politica do navegador): o texto continua
      // visivel e seleccionavel, e a pessoa copia a mao.
      setCopiado(null);
    }
  }

  return (
    <Modal
      aberto={acesso !== null}
      onFechar={onFechar}
      titulo={ehPassword ? `Palavra-passe de ${nome}` : `Convite de ${nome}`}
      subtitulo={
        ehPassword
          ? 'Entregue-a à pessoa. No primeiro acesso ela é obrigada a trocá-la.'
          : acesso?.enviadoPorEmail
            ? `Também seguiu por email para ${acesso.email}. Pode partilhar a ligação por outro canal.`
            : 'O email ainda não está configurado: partilhe a ligação por outro canal.'
      }
      largura={560}
      rodapeNota="Só aparece agora. Se fechar sem copiar, terá de gerar outra."
      accao={{ rotulo: 'Concluído', onClick: onFechar }}
    >
      <span style={rotuloCampo}>{ehPassword ? 'Palavra-passe temporária' : 'Ligação de convite'}</span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', marginBottom: 6 }}>
        <input
          readOnly
          value={valor}
          onFocus={(e) => e.currentTarget.select()}
          aria-label={ehPassword ? 'Palavra-passe temporária' : 'Ligação de convite'}
          style={{
            flex: 1,
            minWidth: 0,
            height: 38,
            padding: '0 12px',
            border: `1px solid ${COR.bordaForte}`,
            borderRadius: RAIO.campo,
            background: COR.fundoCampo,
            color: COR.tinta,
            fontFamily: ehPassword ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
            fontSize: ehPassword ? FONTE.base : FONTE.corpo,
            letterSpacing: ehPassword ? '0.04em' : undefined,
            ...numerico,
          }}
        />
        <button
          type="button"
          onClick={() => void copiar(valor, 'valor')}
          style={{ ...botaoSecundario, height: 38, flex: '0 0 auto' }}
        >
          {copiado === 'valor' ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      {validade && !ehPassword ? (
        <div style={{ fontSize: FONTE.nota, color: COR.suave, marginBottom: 18 }}>Vale até {validade}.</div>
      ) : (
        <div style={{ marginBottom: 18 }} />
      )}

      <span style={rotuloCampo}>Mensagem pronta a enviar</span>
      <pre
        style={{
          margin: '0 0 12px',
          padding: '12px 14px',
          border: `1px solid ${COR.borda}`,
          borderRadius: RAIO.medio,
          background: COR.fundoHover,
          fontFamily: 'inherit',
          fontSize: FONTE.corpo,
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: COR.texto,
        }}
      >
        {mensagem}
      </pre>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => void copiar(mensagem, 'mensagem')} style={botaoSecundario}>
          {copiado === 'mensagem' ? 'Mensagem copiada' : 'Copiar mensagem'}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...botaoSecundario, textDecoration: 'none', fontWeight: PESO.medio }}
        >
          Enviar pelo WhatsApp
        </a>
      </div>
    </Modal>
  );
}
