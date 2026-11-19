# Publicação integrada — 19/11/2026

O usuário confirmou a atualização da **homologação ativa**, usando o ambiente
**Production** do projeto Vercel `fsph-fleet-web-staging`. Os serviços antigos
`fsph-fleet-management` e `fsph-fleet-management-web` não são o destino desta entrega.

## Fontes e destinos conferidos

| Componente  | Fonte e branch                                                                                 | Destino                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| React/Vite  | `BarbosaDev01/fsph-fleet-management-web-deploy`, `feat/perfis-cadastro-acessos-20261118`, raiz | Vercel `prj_1rYgCg3ttNkG1cyavfNNqExJ2XrY`, time `barbosas-projects-5a2b240e` |
| Java/Spring | `cardosojse/fsph-fleet-management`, `perf/staging-deploy-login-20261111`, raiz                 | Render `srv-dbn0cg0u01pc73fpooqg`, workspace `tea-dbkhptm7bikc73a946p0`      |

Os dois deploys são manuais. O projeto Vercel de homologação não tem conexão Git;
o upload usa a branch do fork acima. O Render consome o Java diretamente do seu
próprio repositório. Nenhum projeto Java é versionado neste fork React.

Branches de trabalho locais: `release/staging-frontend-20261119` e
`release/staging-backend-20261119`, ambas criadas dos respectivos destinos
atualizados. A referência de revisão Java no GitHub é
`integracao-staging-backend-20261119`; o nome `release` já existe no remoto.

## Escopo selecionado

O frontend parte de `327deb30179a89770b7827f2e1131409fefbfc31`. Seu código funcional
é igual ao publicado anteriormente em `2f4511b6d29ea1d92f5af48c577b7dbf928b6e6c`;
os commits posteriores documentavam a entrega. Já contém motoristas/veículos,
usuários, cartões demonstrativos, integração de solicitações, padrão institucional
selecionado e perfil/lotação. Os históricos e equivalências de patches foram
conferidos para evitar reintegrar PRs ainda abertos na origem.

Por escolha do usuário ficaram fora:

- `feature/tela-atendimento-svo`, `31ede13`, sem PR aberto: nova revisão do painel/SVO.
- `khyori06-patch-1`, [PR #13](https://github.com/cardosojse/fsph-fleet-management-web/pull/13): telas HTML/JS SVO.
- Dependabot, [PR #12](https://github.com/cardosojse/fsph-fleet-management-web/pull/12): 17 dependências; checks de qualidade falhando.

O backend desta entrega é
[`913ae68452f67379926ce2bffcd6966a4cc4f85a`](https://github.com/cardosojse/fsph-fleet-management/commit/913ae68452f67379926ce2bffcd6966a4cc4f85a).
Integra os PRs oficiais já incorporados [#14](https://github.com/cardosojse/fsph-fleet-management/pull/14)
(equipes/plantões SVO e auditoria) e [#15](https://github.com/cardosojse/fsph-fleet-management/pull/15)
(cartões e solicitações externas SVO), mantendo transportes/rotas e lotação.
Inclui correções verificadas de serialização de relações LAZY e de filtros nulos
no PostgreSQL. A branch consolidada independente não foi publicada integralmente.

## Verificações e banco

- pnpm 11.25.0, lockfile congelado e Node 24: lint, **214 testes**, typecheck/build aprovados.
- Java 21, Maven Wrapper `-B verify`: **254 testes**, zero falhas/erros/ignorados e pacote Spring Boot gerado.
- PostgreSQL real isolado: banco vazio, upgrade V25→V29, checksums, dados e permissões antigas preservados; matriz personalizada mantida.
- HTTP local com banco real e sem transação envolvendo o teste: cartões vinculados, consultas com/sem filtros, solicitações SVO, auditoria, equipes/plantões e histórico de viagens.
- Neon existente conferido em transação somente leitura com TLS: 24 migrations até V25, todos os checksums iguais à origem antes do deploy.

V1–V25 permanecem idênticas. V26 cria equipes/plantões/auditoria; V27 cartões;
V28 solicitações SVO; V29 amplia o catálogo sem excluir permissões de rotas e
transportes. Somente matrizes padrão intactas recebem concessões novas; matrizes
personalizadas permanecem sob decisão administrativa. ADMIN já tem acesso total
por definição. Nenhum `repair`, `clean`, baseline artificial ou migração destrutiva.

URL da API, CORS, Neon, JWT, contas, plano/região e flags de ambiente foram
preservados. Arquivos `.env`, credenciais e artefatos locais não são versionados
nem enviados ao frontend. O bundle é produzido com as variáveis existentes do
ambiente Production; confirmar a origem Render no artefato antes da promoção.

## Operação

Publicar primeiro o backend, confirmar SHA e status `live`, saúde, histórico
Flyway e preservação de usuários/setores/permissões. Depois preparar um build
Vercel **Production** sem atribuição de domínio, conferir o artefato e promover
esse mesmo build. O domínio público deve ser validado por login real, chamadas
cross-origin às APIs antigas e novas, formulário de lotação sem salvar alterações,
logout e rejeição do JWT revogado.

- Aplicação: https://fsph-fleet-web-staging.vercel.app
- API: https://fsph-fleet-api-staging.onrender.com

Os módulos demonstrativos não passam a gravar cartões ou solicitações SVO novas
automaticamente pela existência dos endpoints. As candidatas de interface e os
PRs de revisão para a `main` continuam fora do escopo escolhido. A reversão de
código não remove V26–V29 nem suas concessões adicionais. O binário Java anterior
não conhece as permissões novas: uma reversão requer um build compatível com o
catálogo V29, preservando os dados e o histórico Flyway.

## Resultado confirmado

- Render: commit `913ae68452f67379926ce2bffcd6966a4cc4f85a`, deployment
  `dep-dbvik6ivcj2c73d2a6e0`, **live**, saúde **UP**. A CI GitHub passou.
- Vercel: commit `029dd686f3061708e6a5380ace3475b63b926030`, deployment
  `dpl_3NqRoHzyte5XKfHxJELAvakyJPC9`, **Production / READY / PROMOTED**.
  O alias público foi conferido apontando exatamente para esse deployment.
- Build remoto efetivo Vite, Node 24.x e `dist`; URL da API conferida nos chunks
  protegidos usando a CLI autenticada, sem desabilitar proteção. O conector
  Vercel retornou 403; a CLI acessou o mesmo projeto e time e concluiu a operação.
- Neon após o deploy: 28 migrations até V29, todos os checksums correspondentes.
  As cinco contas, os sete setores e todas as permissões anteriores foram preservados.
- Navegador público, sem mocks: login, nove chamadas cross-origin reais com HTTP 200,
  formulário de perfil/lotação vindo da API, edição cancelada, logout e JWT revogado.
  Nenhum erro JavaScript de página ou alteração de cadastros.
- Logs de aplicação Render: zero erros entre `16:59:59Z` e `17:04:20Z` de
  19/11/2026 (`13:59:59`–`14:04:20`, America/Fortaleza).

As escritas dos módulos novos foram testadas no PostgreSQL local isolado; o
percurso público usou consultas e autenticação. Houve somente um deploy por
plataforma. Os commits posteriores de documentação nas branches de trabalho
registram estas evidências e não disparam outra publicação.

Evidência sem credenciais ou dados pessoais:
[publicacao-integrada-20261119.json](evidencias/publicacao-integrada-20261119.json).
