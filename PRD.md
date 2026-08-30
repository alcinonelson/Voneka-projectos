# NEXORA Projectos - PRD

## Visao
Sistema corporativo de gestao e acompanhamento de projectos, nivel empresarial. A gestora de
projectos regista o projecto: qual e a natureza, em que estagio esta, quem sao os responsaveis,
qual e o roteiro de fases. Atribui a cada pessoa funcoes concretas com deadline. O colaborador,
ao terminar, assinala a tarefa como cumprida e e obrigado a escrever um mini relatorio da
situacao. E esse relato, e nao uma percentagem, que da o follow-up real a Direccao.

## Perfis
- **Administrador** (Direccao) - Painel, Projectos, Roteiro, Tarefas, Relatorios, Equipa e acessos
- **Gestor de projecto** - os projectos onde e responsavel
- **Colaborador** - As minhas tarefas, Os meus projectos, Os meus relatorios, Roteiro

## Modelo de dados

### Natureza do projecto (tipo)
Implementacao, Concurso, Marketing, Prospeccao, Tarefa regular.
Ponto colorido mais etiqueta; e tambem o filtro da carteira. Cada natureza carrega um modelo
de fases proprio ao registar o projecto.

### Estagio
Descoberta, Planeamento, Execucao, Validacao, Entrega.

### Saude
No prazo, Em risco, Atrasado. Define a cor da barra de avanco.

### Fases
Personalizaveis por projecto: renomear, mudar estado (clique cicla Planeada -> Em curso ->
Concluida -> Atrasada), ajustar duracao em semanas, remover, acrescentar, reordenar por arrasto.
Ao gravar encadeiam-se pela ordem com dois dias entre elas; as datas exactas afinam-se depois
por arrasto no roteiro.

### Tarefas
Escritas por quem atribui, nunca pre-configuradas. Campos: tarefa, o que se espera como entrega,
projecto, fase do roteiro, responsavel (com as suas tarefas abertas a vista), deadline, esforco
estimado, prioridade, quando alertar, e se a conclusao exige mini relatorio.

### Alertas de deadline
Cinco escaloes, portados de `alerta()` no design:

| Condicao | Texto | Cor |
|---|---|---|
| estado Concluida | Cumprida | verde |
| dias menor que 0 | N dias em atraso | vermelho cheio |
| dias igual a 0 | Vence hoje | vermelho |
| dias ate 2 | Vence amanha / Faltam 2 dias | ambar |
| dias ate 7 | Faltam N dias | cinza |
| resto | em N dias | suave |

### Mini relatorio
Obrigatorio para fechar tarefa marcada com `requires_report`. Situacao (Sem obstaculos / Com
obstaculo / Bloqueado), texto com minimo de 25 caracteres, esforco real, prova de execucao.
Ao submeter, a tarefa muda de estado e o relatorio entra no feed como "A espera de validacao".

### Utilizadores
Criar membro cria a conta. Nome, email (credencial, validado), telefone, funcao, departamento,
data de entrada, alocacao (25/50/75/100%), nivel de acesso e projectos iniciais, com envio de
convite opcional que expira em 7 dias.

## Ecras
1. **Painel** - faixa de foco (data, frase que nomeia o que trava a operacao, dois numeros
   grandes), Precisa da sua decisao (tres itens com alerta e accao), duas colunas: Avanco da
   carteira e Prazos a vencer
2. **Projectos** - carteira filtravel por natureza, com estagio, responsavel, avanco, deadline
   com alerta e tarefas abertas/total. Clique abre a gaveta: factos, roteiro por fases, tarefas
   reais, accoes
3. **Roteiro** - gantt Jul-Dez 2026, escala Mes/Semana/Dia, navegacao e Hoje, linha vermelha do
   dia, fins de semana sombreados na vista diaria, arrasto para mover e redimensionar fases,
   repor plano original
4. **Tarefas** - lista ordenada por deadline, semaforo de prazo, filtros, assinalar cumprida
5. **Relatorios** - feed dos mini relatorios, validar entrega, leitura da semana e tipologia de
   obstaculos
6. **Equipa e acessos** - tabela de pessoas com email, funcao, departamento, nivel de acesso,
   tarefas abertas, carga, cumprimento de prazos e estado da conta
7. **Colaborador** - as suas tarefas em cartoes, os seus projectos com a sua parte, os seus
   relatorios com estado de validacao
8. **Login** - novo, na linguagem visual NEXORA

## Endpoints

### auth
- `POST /api/auth/login` - email e password, devolve access e refresh
- `POST /api/auth/refresh` - roda o refresh token
- `POST /api/auth/logout` - revoga o refresh token
- `GET /api/auth/me` - utilizador da sessao
- `POST /api/auth/accept-invite` - define password a partir do token de convite

### users
- `GET /api/users` - equipa com carga, tarefas abertas e cumprimento (Administrador)
- `POST /api/users` - registar membro, cria conta, convite opcional
- `PATCH /api/users/:id`
- `POST /api/users/:id/resend-invite`

### projects
- `GET /api/projects` - carteira, filtravel por natureza, com scoping por nivel de acesso
- `POST /api/projects` - registar projecto com modelo de fases da natureza
- `GET /api/projects/:id` - detalhe da gaveta
- `PATCH /api/projects/:id`

### phases
- `GET /api/projects/:id/phases`
- `PUT /api/projects/:id/phases` - grava o roteiro completo, reencadeia datas
- `PATCH /api/phases/:id/schedule` - arrasto no roteiro
- `POST /api/projects/:id/phases/reset` - repor plano original

### tasks
- `GET /api/tasks` - filtros Abertas, Atrasadas, Concluidas, Todas
- `POST /api/tasks` - atribuir tarefa
- `PATCH /api/tasks/:id`
- `POST /api/tasks/:id/complete` - transaccao: fecha tarefa e cria relatorio
- `POST /api/tasks/:id/extension` - pedir prorrogacao

### reports
- `GET /api/reports` - feed, com leitura da semana e tipologia de obstaculos
- `POST /api/reports/:id/validate` - validar entrega

### dashboard
- `GET /api/dashboard` - faixa de foco, decisoes, avancos, prazos

### notifications
- `GET /api/notifications`
- `POST /api/notifications/:id/read`

## Fases de execucao
1. Fundacao - monorepo, shared, testes das regras
2. Base de dados - esquema Drizzle, migracoes, seed do design
3. Auth - JWT, refresh hashado, niveis de acesso
4. API de dominio - projects, phases, tasks, reports, dashboard
5. Frontend esqueleto - tokens, sidebar, cabecalho, router, login
6. Frontend Direccao - 6 ecras, gaveta, 4 modais
7. Frontend colaborador - 3 ecras, modal de conclusao
8. Pendentes - reordenar fases por arrasto, vista mobile, notificacoes efectivas
