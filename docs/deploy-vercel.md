# Homologação na Vercel

## Origem oficial e isolamento

Este código vem exclusivamente de
<https://github.com/cardosojse/fsph-fleet-management-web>, `main` em `7294144`.
A branch `chore/deploy-vercel` foi criada em um worktree separado:
`C:\Users\barbo\fsph-fleet-management-web-vercel`.

O checkout original `feat/conexão-telas` contém trabalho não commitado da equipe.
Seus arquivos, índice e branch foram preservados; nenhuma tela ou contrato desse
trabalho foi copiado para esta branch. Não foi usado frontend de branches do backend.

A conta autenticada tem somente leitura no repositório oficial. Foi criado o fork
autorizado <https://github.com/BarbosaDev01/fsph-fleet-management-web-deploy> para
publicar exclusivamente a branch de deploy e propor um PR ao repositório oficial.
O outro repositório homônimo já existente na conta foi preservado.

## Arquitetura encontrada

React 19.3.1, TypeScript 5.9.3, Vite 8.3.5, MUI, TanStack Query, React Hook Form,
Zod e `openapi-fetch`. Runtime Node.js **24.x**, pnpm **11.25.0**, lockfile preservado.
Saída do build: `dist`.

O cliente HTTP existente adiciona `Authorization: Bearer` a partir do token em
`sessionStorage`, e o parser de erros usa Problem Details. Esses mecanismos
foram preservados. As rotas existentes na `main` são `/` e a página de erro `*`.
O contrato OpenAPI versionado ainda é um placeholder vazio; a `main` não possui
tela de login ou módulos de negócio integrados. A publicação dessa base não
significa que as funcionalidades em desenvolvimento já estejam integradas.

## Variáveis de ambiente

| Variável                | Uso                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `VITE_API_URL`          | Na Vercel, origem HTTPS confirmada do backend Render, sem `/api`, `/api/v1`, query ou fragmento |
| `VITE_API_BASE_URL`     | Variável anterior, mantida para compatibilidade; padrão `/api`                                  |
| `VITE_API_PROXY_TARGET` | Somente desenvolvimento Vite; padrão `http://localhost:8080`                                    |
| `OPENAPI_URL`           | Ferramenta de geração de contrato, não é chamada de produção do navegador                       |

`VITE_API_URL` tem precedência e as barras finais são removidas. Exemplo de formato,
que deve ser substituído pela URL efetivamente publicada:

```dotenv
VITE_API_URL=https://seu-backend-de-homologacao.onrender.com
```

Nenhuma variável `VITE_*` deve conter senha, JWT, chave de API ou conexão de banco.
O script `scripts/check-deploy-env.mjs` impede o build Vercel sem uma origem HTTPS
válida e rejeita localhost, credenciais, caminhos e parâmetros. Não há URL pública
Render confirmada nesta entrega; nenhum endereço foi inventado como publicado.

O desenvolvimento, Vite proxy e Docker/Nginx existentes continuam usando sua
configuração anterior. Não é necessário alterar páginas para selecionar o backend.

## Projeto Vercel preparado

Criar um projeto de homologação **novo**, separado dos projetos da equipe:

- Root Directory: raiz deste repositório, não uma pasta do backend.
- Framework: Vite.
- Node.js: 24.x, também fixado no `package.json`.
- Instalação: pnpm 11.25.0 com lockfile congelado.
- Build: verificação de `VITE_API_URL`, typecheck e build Vite.
- Output Directory: `dist`.
- `vercel.json` contém fallback SPA para `/index.html` e desliga deploys Git automáticos.
- Configurar `VITE_API_URL` no ambiente Preview antes do deploy manual.

Depois da publicação, confirmar a URL HTTPS Vercel, adicioná-la exatamente a
`CORS_ALLOWED_ORIGINS` do backend de homologação e verificar login e chamadas
protegidas. Alterações de `VITE_API_URL` exigem um novo build.

Não foram encontrados token/sessão Vercel CLI/API ou acesso automatizado ao
navegador. Nenhum projeto Vercel foi criado ou alterado e nenhuma URL pública
de frontend foi confirmada. A configuração está preparada para publicação após
autenticação e definição das URLs reais.

## Testes executáveis

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Os testes novos verificam precedência e compatibilidade das URLs, token no cliente
HTTP e remoção do token, além de acesso direto a uma rota SPA. Os testes unitários
não dependem de um contrato OpenAPI fictício: exercitam o transporte existente
enquanto a geração oficial do contrato permanece trabalho separado da equipe.

Para o teste real de autenticação pelo navegador, fornecer exclusivamente
credenciais de homologação no processo:

```text
STAGING_API_URL=<origem da API de homologacao>
STAGING_ADMIN_EMAIL=<email do administrador de homologacao>
STAGING_ADMIN_PASSWORD=<senha de homologacao>
```

`e2e/staging.spec.ts` abre o frontend e faz requisições cross-origin reais de login,
identidade protegida e logout. O navegador aplica o CORS e executa o preflight
da autenticação JSON e do cabeçalho Bearer. Senhas/tokens não são retornados pelo
teste e traces/vídeos desse cenário ficam desligados. Sem essas variáveis, apenas
esse cenário de integração é ignorado, mantendo a CI independente de segredos.

Resultados já confirmados:

- Na base: lint, typecheck, teste existente e build passaram.
- Após a configuração: lint, typecheck, **7 testes unitários** e build passaram.
- Os dois testes Playwright de interface/SPA passaram.
- O `format:check` local já falhava em **34 arquivos antes das alterações**, no
  checkout Windows. Não foi executada formatação geral; os arquivos desta entrega
  são formatados e verificados separadamente. A CI original não foi enfraquecida.
- O verificador Vercel aceitou uma origem HTTPS de teste e rejeitou HTTP local,
  credenciais, caminho `/api` e query strings. Isso não confirma publicação.
- Validação final: **3 testes Playwright passaram**, incluindo autenticação
  cross-origin real do navegador em `127.0.0.1:4173` para o contêiner Java 21 em
  `127.0.0.1:18082`, com banco Neon remoto de homologação. Foram confirmados
  preflight, login, identidade ADMIN, logout e rejeição do JWT revogado.
- No backend, 18 migrations foram aplicadas com sucesso no novo banco isolado;
  o smoke HTTP também confirmou persistência e limpeza de um setor temporário.

Esses resultados são de homologação local com banco remoto. A integração nas
URLs públicas Render/Vercel ainda depende da publicação e das origens confirmadas.
Logs locais: `.deploy-validation/baseline-*.log`, `final-*.log`, `e2e.log` e
`e2e-staging.log`; não são incluídos no Git.

## Escopo dos arquivos

Configuração: `vercel.json`, `package.json` (Node 24.x), `.env.example`, `.gitignore`,
`scripts/check-deploy-env.mjs`, `src/shared/config/env.ts` e `src/vite-env.d.ts`.
Testes: `src/shared/config/env.test.ts`, `src/shared/api/client.test.ts`,
`e2e/app.spec.ts` e `e2e/staging.spec.ts`. Documentação: este arquivo e link no README.

Não houve mudança de componentes, estilos, layouts, fluxos de negócio ou dependências.
Nenhum merge em `main` foi realizado. Figma, Jira e Mermaid indicados na missão
não ficaram acessíveis; não foram feitas inferências de interface ou esquema a
partir de conteúdo indisponível.

Referências verificadas: [Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite),
[configuração Git Vercel](https://vercel.com/docs/project-configuration/git-configuration),
[forks GitHub](https://docs.github.com/en/rest/repos/forks).
