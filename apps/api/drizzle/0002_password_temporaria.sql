-- Palavra-passe temporaria gerada pelo Administrador: a sessao so serve para a trocar.
-- As colunas de recuperacao ja vieram na 0001, escrita a mao e sem snapshot; o drizzle-kit
-- voltava a gera-las aqui. O snapshot 0002 ja as tem, e a partir daqui o diff fica certo.
ALTER TABLE "users" ADD COLUMN "deve_mudar_password" boolean DEFAULT false NOT NULL;
