# Entrega — interface unificada e integração funcional

Concluída em 17/11/2026, America/Fortaleza. Branch `fix/unificacao-visual-integracao-20261116`, criada de `b52dbea` no fork de integração. Não houve merge, deploy ou alteração nos repositórios oficiais, backend, migrations, CORS, credenciais ou configuração remota.

O [diagnóstico inicial](auditoria-unificacao-visual.md) foi registrado no commit `3b1f21a` antes da mudança de arquitetura. Ele contém o inventário de **14 grupos de telas**, mocks, componentes duplicados, equivalentes operacionais, contratos e lacunas.

## Resultado por área

| Área revisada                            | Resultado entregue                                                                                                                                                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Motoristas e cadastro                    | Uma listagem real, busca, filtros de situação/setor, detalhes e CNHs. Cadastro seleciona um User MOTORISTA ativo e envia apenas `userId`. Não há veículo permanente.                                                                                                |
| Veículos e cadastro                      | Uma listagem real, busca, filtros, detalhes, criação, edição, desativação e documentos. Setor opcional; capacidade inclui condutor; odômetro real.                                                                                                                  |
| Usuários, credenciamento e diretório     | Módulo único de `/users`, com os UserRole reais, setores, senha, edição, ativação/desativação. Consultas auxiliares falhas não viram campos de ID livre.                                                                                                            |
| Dashboard SVO e dashboard de usuários    | Incorporados em `/dashboard`: contagens reais de cadastros ativos e solicitações pendentes/agendadas. Falha de consulta, falta de autorização e zero confirmado são estados diferentes.                                                                             |
| Solicitações e nova solicitação          | Incorporadas em `/solicitacoes`: lista geral ou `/mine` conforme autoridade, busca/status, criação, detalhes, edição e cancelamento de pendentes pelo autor. Formulário inclui finalidade e período completo; datas de Fortaleza serializadas com offset explícito. |
| Atendimento e agendamento                | `/atendimento-svo` usa o fluxo canônico de TripRequest: aprovação, rejeição e agendamento, com motorista/veículo da disponibilidade. Não converte estados de triagem nem cria execução de Trip implicitamente.                                                      |
| Triagem SVO demonstrativa                | Mantida em `/demonstracoes/atendimento-svo`, com aviso de simulação. Removidos sidebar, perfil e controles de saída internos. CSS limitado ao seu contêiner. Análise/complemento continuam somente em memória.                                                      |
| Cartões de combustível                   | Preservados listagem, filtros, cadastro, edição, detalhes, vínculos e estados em memória, sob as flags existentes. Avisos de ausência de persistência permanecem visíveis. Nenhum endpoint inventado.                                                               |
| Login demonstrativo                      | Endereço antigo leva à conta da sessão válida. `/login` continua sendo o login JWT original, sem mudanças em sua implementação.                                                                                                                                     |
| Cadastro institucional demonstrativo     | Endereço antigo abre o formulário administrativo real em `/usuarios/novo`. Nenhum cadastro público novo.                                                                                                                                                            |
| Recuperação e redefinição demonstrativas | Recuperação por e-mail mostra indisponibilidade, sem coletar dados ou simular envio. Alteração de senha encaminha para `/conta`, que exige a senha atual.                                                                                                           |
| Transportes e rotas existentes           | Preservados `/transportes` e `/viagens`, incluindo cronograma, paradas e execução Route; controles passam a respeitar suas autoridades. Não foram renomeados para TripRequest/Trip.                                                                                 |

Os antigos caminhos de frota, dashboards, solicitações, credenciamento, diretório e autenticação foram mantidos como aliases. URLs de criação abrem os formulários reais, inclusive por acesso direto. Os arquivos originais dos protótipos incorporados e seus testes foram preservados; `src/test/prototype-routes.tsx` os exercita isoladamente, sem incluí-los na navegação operacional.

## Componentes compartilhados

- `AppLayout`: única navegação MUI, Drawer permanente em desktop e temporário em telas menores, cabeçalho da sessão real e link para pular ao conteúdo.
- `useAccess` e `ModuleAccess`: menus, acesso direto e ações usam `me.permissions`, sem presumir concessões pelo papel ADMIN. A API continua autorizando cada operação.
- `FilterBar`: busca e seletores reutilizados pelos cadastros; filtros podem ser combinados e limpos.
- `RegistryScreen`: CRUD, filtros, estados e confirmações comuns, com permissão de escrita e abertura por URL de criação.
- `PageHeading`, `DataTable`, `FormDialog`, `ActionForm` e `ApiFeedback` foram reutilizados. A tabela possui região focável para rolagem horizontal por teclado; erros de campo permanecem associados aos controles.
- Tema MUI e tokens institucionais preservados. A triagem usa CSS específico com seletores prefixados por `.svo-app-shell`, evitando afetar outros módulos depois da navegação.

## Contratos comprovados

O frontend publicado na Vercel era `a469962`, deployment `dpl_4CGhq89SLCb3DUAyCi6aivx2kbBa`. A base mais completa era `b52dbea`, com cartões. O backend LIVE consultado no Render era `c804cb1`, deploy `dep-dbqb3v6c6qcc73fqvjbg`.

O OpenAPI público desse backend confirmou simultaneamente os quatro recursos. A comparação Git de `c804cb1` com a main oficial `411793f` não encontrou diferenças em `TripController`, `TripRequestController`, `CreateTripRequest` e `TripRequestResponse`; encontrou ausência dos controllers Route e Transport na main. A branch backend consolidada `263a427` não foi publicada por esta tarefa.

`scripts/import-staging-contracts.mjs` importa seletivamente os caminhos canônicos e seus schemas, preservando os contratos legados. O snapshot e os tipos gerados incluem as permissões da sessão. O editor usa o catálogo retornado pelo servidor e preserva autoridades desconhecidas ao substituir um perfil.

O escopo de leitura de TripRequest é definido pelo backend: `TRIP_REQUESTS_READ` permite a consulta geral; somente `TRIP_REQUESTS_WRITE` usa `/mine`. Não foi criada uma falsa restrição SVO/setorial no navegador. Edição/cancelamento exigem propriedade e estado PENDING; aprovação/rejeição/agendamento usam MANAGE e os estados permitidos. Disponibilidade é invalidada após alterações; o servidor revalida os vínculos e conflitos ao gravar.

## Testes e evidência funcional

Ambiente: Node **24.22.3**, pnpm **11.25.0**, lockfile e versões das dependências preservados.

| Verificação                                            | Resultado                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| `pnpm typecheck`                                       | Aprovado                                                    |
| `pnpm lint`                                            | Aprovado, sem avisos                                        |
| `pnpm test`                                            | **196 testes aprovados**, 30 arquivos                       |
| `pnpm format:check`                                    | Aprovado                                                    |
| `pnpm build`                                           | Aprovado                                                    |
| `pnpm test:e2e --workers=2`                            | **33 aprovados**, 4 condicionais sem execução nessa chamada |
| Playwright do catálogo e aliases, após recaptura final | **6 aprovados**, incluindo 390/768/1440 px                  |
| `pnpm test:e2e:staging <arquivo-local-de-acesso>`      | **1 cenário real aprovado**, aproximadamente 1,4 minuto     |

Os testes de interface da suíte padrão usam fixtures declaradas, para verificar navegação, formulários, erros, vazios, teclado, responsividade e bloqueio das demonstrações em produção. Não são apresentados como comprovação de persistência remota. Os quatro testes condicionais incluem o novo teste real, executado separadamente; os três legados continuam dependentes de suas configurações/fixtures específicas.

O cenário `e2e/staging-functional.spec.ts` executou contra **a API real de staging**, sem interceptar seu domínio ou substituir respostas:

1. Login JWT pelo formulário e sessão restaurada após recargas.
2. Criar, editar, recarregar e excluir um setor temporário.
3. Cadastrar usuário MOTORISTA; cadastrar Driver pelo seu `userId`; registrar e recarregar CNH.
4. Cadastrar e editar veículo sem setor obrigatório; registrar documento; confirmar os dados após recarregar.
5. Criar e editar TripRequest; confirmar persistência; cancelar uma solicitação, rejeitar outra, aprovar e agendar uma terceira.
6. Conferir os IDs reais de Driver e Vehicle na resposta do agendamento e recarregar a confirmação.
7. Fazer login com o novo MOTORISTA, verificar o bloqueio da tela administrativa e o **403 real** em `/users`; sair pela interface.
8. Desativar os recursos exclusivos do teste, revogar o JWT administrativo e conferir **401 real** após a revogação.

O staging não permite a origem localhost por CORS. O harness serve somente HTML/assets do artefato local sob a origem de frontend já autorizada, usando roteamento do navegador. Todas as chamadas para `fsph-fleet-api-staging.onrender.com` permanecem diretas e reais. Isso testa o código da branch sem publicar um deployment e sem modificar CORS. Não equivale à validação de um deployment novo na Vercel.

Senhas vieram de arquivo local já existente, sem inclusão em código, linha de comando, screenshots ou traces. As evidências visuais abaixo usam somente fixtures. O teste real não produz capturas de dados pessoais.

O setor exclusivo foi excluído; usuário, Driver e veículo exclusivos foram desativados. **Três solicitações de teste permanecem no histórico**, cancelada, rejeitada e agendada. A reserva usa período passado e recursos exclusivos, sem ocupar capacidade futura. Não houve limpeza por SQL, apagamento de histórico ou alteração de registros institucionais existentes.

## Comparação visual

Capturas anteriores pertencem à base consolidada e não foram sobrescritas. As novas capturas foram revistas visualmente, com fixtures explicitamente identificadas; números das imagens não são indicadores reais da instituição. Em telas menores, tabelas rolam dentro da região focável, sem overflow da página.

| Tela                  | Antes, 1440 px                                                                   | Depois, 1440 px                                                                    | Depois, 390 px                                                                | Depois, 768 px                                                               |
| --------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Dashboard             | [Antes](evidencias/integracao-frontend-consolidada/dashboard-1440.png)           | [Painel único](evidencias/unificacao-visual/dashboard-1440.png)                    | [Celular](evidencias/unificacao-visual/dashboard-390.png)                     | [Tablet](evidencias/unificacao-visual/dashboard-768.png)                     |
| Dashboard de usuários | [Antes](evidencias/integracao-frontend-consolidada/dashboard-usuarios-1440.png)  | [Mesmo painel](evidencias/unificacao-visual/dashboard-1440.png)                    | [Celular](evidencias/unificacao-visual/dashboard-390.png)                     | [Tablet](evidencias/unificacao-visual/dashboard-768.png)                     |
| Triagem SVO           | [Antes](evidencias/integracao-frontend-consolidada/atendimento-svo-1440.png)     | [Shell comum](evidencias/unificacao-visual/prototype-atendimento-svo-1440.png)     | [Celular](evidencias/unificacao-visual/prototype-atendimento-svo-390.png)     | [Tablet](evidencias/unificacao-visual/prototype-atendimento-svo-768.png)     |
| Cartões               | [Antes](evidencias/integracao-frontend-consolidada/cartoes-combustivel-1440.png) | [Shell comum](evidencias/unificacao-visual/prototype-cartoes-combustivel-1440.png) | [Celular](evidencias/unificacao-visual/prototype-cartoes-combustivel-390.png) | [Tablet](evidencias/unificacao-visual/prototype-cartoes-combustivel-768.png) |

Outras telas revisadas: [veículos](evidencias/unificacao-visual/veiculos-1440.png), [motoristas](evidencias/unificacao-visual/motoristas-1440.png), [usuários](evidencias/unificacao-visual/usuarios-1440.png), [solicitações](evidencias/unificacao-visual/solicitacoes-1440.png), [atendimento operacional](evidencias/unificacao-visual/atendimento-svo-1440.png) e [recuperação indisponível](evidencias/unificacao-visual/prototype-recuperar-senha-390.png). A pasta contém **27 capturas**, cobrindo os três tamanhos solicitados.

## Pendências explícitas

- Cartões não possuem contrato de persistência comprovado; seguem demonstrativos.
- Análise, pedido de complemento e estados específicos da triagem SVO não possuem equivalência com TripRequest. Plantões/equipes da main oficial são outro recurso e ainda não estão no backend publicado consultado.
- Recuperação de senha por e-mail/token não está disponível. Alteração com a senha atual permanece funcional.
- Séries históricas de consumo/custos exigem integração adicional no painel; existem APIs de abastecimento, mas não foram inventados dados nem um endpoint agregado.
- As operações Route/Transport dependem do staging legado. Substituir o backend pela consolidada exige decisão própria de domínio; os módulos não são aliases de Trip/TripRequest.
- O cenário real validou ADMIN e MOTORISTA. Não esgota todas as concessões customizadas, concorrência e combinações de propriedade/setor; a autorização continua obrigatória no backend. MANAGE isolado não substitui READ para consultar dados.

A revisão React verificou hooks antes dos retornos condicionais, queries habilitadas por autoridade, ausência de gravação otimista de operações reais, imports lazy por rota, formulários rotulados e navegação única. Nenhuma regra de autenticação foi alterada.

## Revisão e publicação

Commits separados para auditoria, contratos, implementação e validação/evidências. O PR tem como base `staging/integracao-frontend-consolidada` no próprio fork, para mostrar apenas esta correção. `git.deploymentEnabled=false` e os arquivos de deploy existentes foram preservados; a publicação da branch não autoriza merge ou deploy.
