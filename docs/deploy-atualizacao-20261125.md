# Atualização integrada da homologação — 25/11/2026

Publicação concluída no projeto de homologação existente, em America/Fortaleza.

## Código integrado

- Frontend: atualização oficial `5236fd3e1e9babcdae50f7c31ca81360447f289b`, relatórios SVO e impressão.
- Backend: atualização oficial `6fa7f34f2822417989631877aad38384bcbba3a0`, consultas e exportações PDF/Excel.
- O acompanhamento local de coletas SVO de 23/11 foi preservado e incluído nos dois artefatos.
- Cartões, triagem SVO, perfis, lotação, cadastros e navegação da homologação foram mantidos. Os relatórios usam o AppLayout, JWT e controle de acesso existentes.
- A autenticação duplicada da branch de relatórios foi resolvida mantendo a implementação da homologação. O seletor de setores usa o cliente OpenAPI compartilhado.
- A atualização automática de 19 dependências em `origin/dependabot/npm_and_yarn/frontend-45dde9f99b` ficou fora desta publicação funcional; o lockfile validado foi preservado.

As alterações locais originais permanecem intactas: os patches de arquivos rastreados foram comparados por SHA-256 antes/depois. Os arquivos novos foram copiados para branches de release, sem troca de branch, limpeza ou stash nos checkouts originais. Nenhuma `main` oficial foi alterada.

## Artefatos publicados

| Componente      | Identificação                              | Resultado                                                             |
| --------------- | ------------------------------------------ | --------------------------------------------------------------------- |
| API Render      | `76781d87c4d0ae589f11ed6517e9a85c80ecda9e` | `live`                                                                |
| Deploy Render   | `dep-dc3pa6lg1s2s73cajal0`                 | Publicado em 25/11 às 23:15:10                                        |
| Frontend Vercel | `e7cf9bfe43be99f8b93e05732ac90d36bb27015a` | `READY`                                                               |
| Deploy Vercel   | `dpl_7cdhq1NVZKJ1zc3ZNEWEq5JESpvy`         | Produção do projeto de homologação, preparado e promovido sem rebuild |

- Aplicação: <https://fsph-fleet-web-staging.vercel.app>
- Relatórios: <https://fsph-fleet-web-staging.vercel.app/relatorios>
- Coletas: <https://fsph-fleet-web-staging.vercel.app/coletas-svo>
- API: <https://fsph-fleet-api-staging.onrender.com>
- Frontend remoto: `BarbosaDev01/fsph-fleet-management-web-deploy`, `release/staging-frontend-20261125`.
- Backend remoto: `cardosojse/fsph-fleet-management`, `integracao-staging-backend-20261125`; a branch fonte existente `perf/staging-deploy-login-20261111` recebeu avanço fast-forward para o mesmo SHA.

O Render permaneceu com auto-deploy desligado. Repositório, branch fonte, plano, região, CORS, credenciais e configurações de banco não foram trocados. O único avanço de schema foi a migration V30 de coletas, aplicada pelo Flyway. As migrations anteriores não foram modificadas.

## Verificação

- Backend: **312 testes**, zero falhas, erros ou ignorados; build Maven aprovado com JDK 21 e PostgreSQL 18 isolado.
- Frontend: **286 testes em 39 arquivos**. A suíte foi executada em processos isolados por arquivo; os arquivos corrigidos foram reexecutados. Typecheck, lint, formatação e build final passaram com Node **24.22.3**.
- E2E local com PostgreSQL/API reais: triagem, geração idempotente, atribuição, coleta móvel, providência, entrega, histórico, indicadores, conflitos e autorização; mais consultas de relatórios e exportações. **2 cenários aprovados**.
- E2E no endereço publicado: login real, nove consultas SVO e suas dezoito exportações PDF/Excel, consulta de abastecimentos, downloads pela interface, impressão sem navegação, larguras 390/768/1440, reload e logout com revogação do JWT. **1 cenário aprovado em 43,5 segundos**, sem erros JavaScript. Sem interceptação de API ou de frontend.
- API publicada: health `UP`, **123 caminhos OpenAPI**; leituras autenticadas de usuários, setores, veículos, motoristas, cartões, triagem, coletas e relatório geral retornaram 200.
- O alias público entregou HTTP 200 e o mesmo arquivo principal do artefato preparado (`index-DoTl8m9h.js`).
- Logs de erro: zero registros Render entre 02:15:10Z e 02:17:12Z; zero registros Vercel entre 02:16:00Z e 02:17:11Z de 26/11 (UTC). Isso descreve a janela consultada.

Um primeiro build Vercel, não promovido, encontrou uma opção de teste incompatível com a tipagem da Testing Library; a correção foi validada pelo build completo e pelo deploy final. O aviso já existente de chunk acima de 500 kB continua sem impedir o build.

Os relatórios de frota/SVO seguem as permissões e os contratos da atualização oficial. O acompanhamento de tempos das novas ordens de coleta continua em `/indicadores-svo`; ele não é confundido com os painéis de viagens dos relatórios oficiais.

Evidência sanitizada: [atualizacao-render-vercel-20261125.json](evidencias/atualizacao-render-vercel-20261125.json).

## Retorno de versão

Referências anteriores: frontend `dpl_W6YyL7azKndx6JB6wWWXiB9NFHPc`; backend `dep-dbvqbkt9fdbs73bml7ag`, código `913ae68452f67379926ce2bffcd6966a4cc4f85a`.

O retorno do frontend pode reutilizar o artefato anterior. O retorno da API exige código compatível com V30 e com os novos valores `SVO_ORDERS_*` do catálogo persistido; promover cegamente a API anterior pode impedir o carregamento das permissões. Um rollback de deploy não desfaz migrations. Não executar `repair`, limpeza de schema ou remoção de permissões como atalho.
