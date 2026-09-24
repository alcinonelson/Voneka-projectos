# Deploy da SPA em projects.get.co.mz

O portal e uma SPA Vite. O cliente chama sempre `/api` na mesma origem: o cookie de
refresh (`path: /api/auth`, `sameSite: strict` em producao) nao sobrevive a outro
dominio. Por isso a API tem de responder em `https://projects.get.co.mz/api`, via
proxy Apache/cPanel para o processo Node.

Este workflow so publica o `dist` da web. A API corre noutro processo, no mesmo
alojamento ou atras do proxy.

## Secrets no GitHub

Reutilizados de outros deploys no mesmo servidor:

| Secret | Uso |
|---|---|
| `SSH_PRIVATE_KEY` | Chave privada da conta SSH do cPanel |
| `REMOTE_HOST` | Anfitriao SSH |
| `REMOTE_USER` | Utilizador SSH |
| `REMOTE_PORT` | Porta SSH. No cPanel costuma ser `21098`, nao `22` |

Deste produto:

| Secret | Uso |
|---|---|
| `PROJECTS_REMOTE_PATH` | Document root do subdominio `projects` (ex. `/home/UTILIZADOR/projects.get.co.mz`) |
| `PROJECTS_PUBLIC_URL` | Opcional. Default `https://projects.get.co.mz` |

No processo da API (nao neste workflow):

```
WEB_ORIGIN=https://projects.get.co.mz
NODE_ENV=production
```

## cPanel

1. Criar o subdominio `projects.get.co.mz` e anotar o document root.
2. Colar esse caminho em `PROJECTS_REMOTE_PATH`.
3. Proxiar `/api` para o Node (Application Manager / Reverse Proxy). Sem isto o
   portal abre e o login falha.
4. `mod_rewrite` ligado. O `.htaccess` do `dist` reescreve as rotas do React
   para `index.html` e deixa `/api` em paz.

## Correr

Push a `main` que toque em `apps/web`, `packages/shared` ou neste workflow; ou
**Actions → Deploy Voneka web → Run workflow**.

## SSH inacessivel

Se a porta 22 falhar, defina `REMOTE_PORT` com o valor do cPanel (o mesmo dos
outros workflows). Confirme que o IP do GitHub Actions nao esta bloqueado no
firewall do alojamento.
