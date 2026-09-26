# Deploy da SPA em projects.get.co.mz

O portal e uma SPA Vite. O cliente chama sempre `/api` na mesma origem: o cookie de
refresh (`path: /api/auth`, `sameSite: strict` em producao) nao sobrevive a outro
dominio. Por isso a API tem de responder em `https://projects.get.co.mz/api`, via
proxy Apache para o processo Node (`voneka-api` no PM2, porta **3020**).

Este workflow so publica o `dist` da web no document root
(`/home/voneka/public_html/projects.get.co.mz`). A API nao vai para essa pasta:
ficaria servida pelo Apache, com `.env` a vista. Vive em
`/home/voneka/apps/projects.get.co.mz` e arranca com `ecosystem.config.cjs`. Sem
esse processo, `/api` devolve HTML da SPA e o cliente mostra
«O servidor não respondeu como esperado.»

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

No processo da API (`apps/api/.env` no servidor, fora do document root):

```
NODE_ENV=production
PORT=3020
WEB_ORIGIN=https://projects.get.co.mz
```

JWT e `DATABASE_URL` ficam so nesse ficheiro. Segredos de exemplo sao recusados
em producao. Arranque:

```
pm2 start /home/voneka/apps/projects.get.co.mz/ecosystem.config.cjs
pm2 save
```

## cPanel

1. Criar o subdominio `projects.get.co.mz` e anotar o document root.
2. Colar esse caminho em `PROJECTS_REMOTE_PATH`.
3. O `.htaccess` proxia `/api` para `http://127.0.0.1:3020` (o mesmo padrao da
   Mobility). Sem o processo `voneka-api`, criar empresa e entrar falham.
4. `mod_rewrite` e `mod_proxy` ligados. Portas ocupadas neste alojamento:
   store 3000, mobility 3010-3012, voneka-api 3020.

## Correr

Push a `main` que toque em `apps/web`, `packages/shared` ou neste workflow; ou
**Actions → Deploy Voneka web → Run workflow**.

## SSH inacessivel

Se a porta 22 falhar, defina `REMOTE_PORT` com o valor do cPanel (o mesmo dos
outros workflows). Confirme que o IP do GitHub Actions nao esta bloqueado no
firewall do alojamento.

## Smoke test: 404 na raiz

Dois casos distintos:

**1. O `.htaccess` nao chegou ao `dist`**

O `upload-artifact@v4` ignora ficheiros ocultos. O workflow ja envia
`include-hidden-files: true`. O `.htaccess` tem de ter `DirectoryIndex index.html`
(neste vhost da Hostinger a raiz 404 sem isso).

**2. Document root errado**

O deploy chegou ao servidor mas o virtual host aponta para **outra pasta**.

1. cPanel → **Domains** → `projects.get.co.mz` → anotar o **Document Root**.
2. Actualizar o secret `PROJECTS_REMOTE_PATH` com esse caminho exacto.
3. Voltar a correr o workflow.

Caminhos habituais no cPanel:

```
/home/UTILIZADOR/projects.get.co.mz
/home/UTILIZADOR/public_html/projects
```

Se o subdominio ainda nao existir, crie-o primeiro. Sem isso o Apache responde
404 mesmo com ficheiros noutro directorio.
