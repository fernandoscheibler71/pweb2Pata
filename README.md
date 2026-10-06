# Pata Amiga — Prisma + MySQL

Esta versão não utiliza Supabase. O React chama uma API Express e somente a API acessa o MySQL por meio do Prisma. Autenticação usa JWT e imagens são guardadas localmente em `uploads/` (em produção, substitua por armazenamento persistente).

## Configuração

1. Crie um banco MySQL: `CREATE DATABASE pata_amiga;`.
2. Copie `.env.example` para `.env.local` e informe `DATABASE_URL` e um `JWT_SECRET` forte.
3. Instale: `npm install`.
4. Crie as tabelas e gere o cliente:

   ```bash
   npm run prisma:migrate -- --name initial
   npm run prisma:generate
   ```

5. Rode API e frontend: `npm run dev:full`.

O frontend fica em `http://localhost:5173` e a API em `http://localhost:3001`.

## Segurança

- `DATABASE_URL` e `JWT_SECRET` permanecem no servidor, sem prefixo `VITE_`.
- Senhas recebem hash bcrypt e as sessões usam JWT.
- A API exige sessão para mutações, upload e cadastro de animais; Prisma parametriza as consultas ao MySQL.
- Antes de publicar, configure `CLIENT_URL`, HTTPS, armazenamento persistente e um provedor de e-mail para recuperação de senha.
