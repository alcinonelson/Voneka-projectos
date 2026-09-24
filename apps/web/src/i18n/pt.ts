/**
 * Rotulos do interface, em portugues de Mocambique.
 *
 * A forma esta pronta para receber `en.ts`: cada chave e um identificador, nunca uma frase
 * construida no ecran. Os ecras novos leem daqui; os antigos migram quando se lhes toca.
 */

export const pt = {
  sessao: {
    aRetomar: 'A retomar a sessão…',
    aAbrir: 'A abrir o portal…',
    expirou: 'A sessão expirou. Volte a iniciar sessão.',
    naoFoiPossivelContactar: 'Não foi possível contactar o servidor. Verifique a ligação e tente de novo.',
  },
  recuperar: {
    tituloPedir: 'Recuperar a palavra-passe',
    subtituloPedir:
      'Indique o email da conta. Se estiver activa, recebe uma ligação que expira dentro de uma hora.',
    citacao: 'Quem perdeu a palavra-passe não precisa da linha de comandos. Precisa de uma ligação que expire.',
    enviado:
      'Se existir uma conta activa com este email, enviámos uma ligação. Expira dentro de uma hora.',
    enviar: 'Enviar ligação',
    aEnviar: 'A enviar…',
    lembrouSe: 'Lembrou-se?',
    voltar: 'Voltar à entrada',
    tituloNova: 'Nova palavra-passe',
    subtituloNova: 'Escolha uma palavra-passe com pelo menos 12 caracteres.',
    citacaoNova: 'A ligação serve uma vez. Depois disto, as sessões antigas deixam de entrar.',
    novaPassword: 'Nova palavra-passe',
    confirmacao: 'Confirmação',
    curta: 'A palavra-passe precisa de pelo menos 12 caracteres.',
    diferem: 'As palavras-passe não coincidem.',
    definir: 'Definir palavra-passe',
    aGravar: 'A gravar…',
    ligacaoInvalida: 'A ligação não funciona?',
    pedirOutra: 'Pedir outra',
    falhouDefinir: 'Não foi possível definir a palavra-passe.',
  },
  login: {
    perdeuPassword: 'Perdeu a palavra-passe?',
    pedirLigacao: 'Pedir uma ligação nova',
  },
  carteira: {
    exportar: 'Exportar CSV',
    aExportar: 'A exportar…',
    exportada: 'Carteira exportada',
    falhouExportar: 'Não foi possível exportar a carteira.',
  },
  avisos: {
    titulo: 'Avisos',
    subtitulo: 'Prazos a vencer e em atraso nas tarefas que são suas',
    vazio: 'Nenhum aviso por agora.',
    vazioPorLer: 'Leu tudo. Os avisos novos aparecem aqui todas as manhãs.',
    porLer: (n: number) => `${n} por ler`,
    marcarLido: 'Marcar como lido',
    marcarTodos: 'Marcar todos como lidos',
    filtroPorLer: 'Por ler',
    filtroTodos: 'Todos',
    verTarefas: 'Ver tarefas',
  },
  vocabulario: {
    arrastar: 'Arrastar para reordenar',
    ordemGravada: 'Ordem gravada',
    falhouOrdem: 'Não foi possível gravar a ordem.',
  },
  prorrogacao: {
    novaDeadline: 'Nova deadline',
    dataPosterior: 'A nova data tem de ser posterior à actual.',
    formato: 'Use o formato dd/mm/aaaa.',
  },
  erros: {
    inesperado: 'Ocorreu um erro inesperado. Recarregue a página.',
    recarregar: 'Recarregar',
    consulta: 'Não foi possível carregar. Tente de novo.',
  },
} as const;
