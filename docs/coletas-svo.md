# Coletas SVO — implementação e reprodução

Front-end: `cardosojse/fsph-fleet-management-web`, checkout `C:/Users/barbo/fsph-fleet-management-web-integration`, branch `feat/api-fuel-cards-svo-20261119`.

Back-end: `cardosojse/fsph-fleet-management`, checkout `C:/Users/barbo/fsph-fleet-management-web-integration/.deploy-validation/release-backend-20261119`, branch `release/staging-backend-20261119`. Esse worktree já continha a triagem e os cadastros de equipes/plantões usados pelo front. O checkout consolidado inspecionado não continha a triagem, por isso não recebeu mudanças. Caminhos, branches, remotes e Git foram conferidos antes das edições; ambos estavam limpos. O repositório web-deploy não foi alterado.

## Fluxo entregue

A solicitação `SvoDeathRequest` aprovada é a origem. Ela ainda não gerava transporte ou viagem: a nova ordem usa um vínculo único com essa solicitação, geração idempotente e mudança transacional para `ORDER_GENERATED`. O setor é capturado na triagem e preservado na ordem; motorista, equipe e veículo são definidos por atendimento. Há validações de perfil, setor, atribuição, disponibilidade e estado no servidor, além de versão para detectar concorrência. Consulte `docs/coletas-svo.md` do backend para contrato, escopos e migrations.

As telas reutilizam MUI, layout, tipografia, PageHeading, Paper, SummaryCard, mensagens e cliente autenticado existentes de Atendimento SVO. As rotas carregam sob demanda e aparecem no menu e no início conforme permissões:

- `/coletas-svo`: ordens atribuídas ao operador ou ordens do setor para atendimento, busca, situação, prazo e acesso ao histórico. Consulta se atualiza periodicamente e pode ser atualizada manualmente.
- `/coletas-svo/:id`: endereço, agendamento, retorno, prazo, veículo, equipe, motorista, transições devolvidas pela API, observações de campo e providências. Gestor atribui recursos nessa mesma ordem. A tela funciona em 390 px.
- `/indicadores-svo`: filtros por período de entrada da solicitação, equipe e veículo, médias independentes por etapa e linhas que abrem as ordens que compõem o resultado.
- `/atendimento-svo`: após aprovar, **Gerar ou abrir coleta**; solicitações já vinculadas oferecem **Acompanhar ordem de coleta**. O detalhe da ordem também abre a triagem de origem.

Loading, lista vazia, falha de consulta e falha de gravação são apresentados. Texto é preservado na falha; um 409 recarrega a ordem sem repetir automaticamente a escrita. Após salvar, a tela apresenta o registro devolvido pela API. Histórico e horários vêm do PostgreSQL, inclusive após reload e troca de conta.

Não havia regra de SLA. O gestor pode registrar um **Prazo de coleta**, que produz indicação de atraso; sem ele aparece **Sem prazo definido**. A média solicitação→coleta inclui coletas em andamento; médias de entrega só incluem ordens entregues. Os contadores de cada etapa e as linhas permitem conferir o resultado. Período final escolhido na interface inclui o dia inteiro no fuso do navegador.

## Roteiro pelos perfis

1. Cadastre os usuários no mesmo setor SVO: atendente, gestor, motorista ativo e, opcionalmente, equipe de coleta com membros ativos. Cadastre um veículo ativo, disponível e lotado nesse setor. Use as permissões padrão atualizadas pela V30; matrizes personalizadas precisam receber as novas permissões pela administração.
2. Como **ATENDENTE_SVO**, abra uma solicitação pelo endpoint/fluxo existente, acesse **Triagem SVO**, aprove e clique em **Gerar ou abrir coleta → Gerar ordem da triagem aprovada**. Anote o protocolo.
3. Como **GESTOR_FROTA** ou **GESTOR_SVO**, abra **Coletas SVO**, selecione a mesma ordem e atribua motorista, veículo, equipe opcional, agendamento e retorno previsto. O prazo de coleta é opcional.
4. Como **MOTORISTA** designado ou **EQUIPE_COLETA_SVO** vinculada, abra **Coletas SVO**, inicie o deslocamento e registre a coleta, com observação se necessário.
5. Como **ATENDENTE_SVO**, consulte a mesma ordem, escreva a providência e salve. O histórico identifica autor e horário sem substituir registros anteriores.
6. Volte ao operador responsável e conclua a entrega. Recarregue a página para conferir estado e eventos. Como gestor, abra **Indicadores SVO**, filtre veículo/equipe/período e abra a ordem da tabela para comparar os horários.

## Testes reproduzíveis

No front:

```powershell
pnpm test
pnpm lint
pnpm build
pnpm test:e2e:svo
# Outro checkout backend:
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test-svo-local.ps1 -BackendPath C:/caminho/fsph-fleet-management
```

O runner exige Java 21 e PostgreSQL local (paths configuráveis). Ele cria um cluster descartável em loopback com portas livres, executa todos os testes e package da API e usa um segundo banco para o cenário Playwright. Encerra API e PostgreSQL ao terminar e restaura o ambiente. Não depende de Render, Neon, Vercel ou credenciais remotas. O cenário cria dados claramente fictícios e autentica os perfis por JWT real. Não há interceptação/mock de chamadas.

Neste ambiente, a suíte completa Vitest em processo único permaneceu sem progresso; a regressão foi concluída em processos separados por arquivo, mesma estratégia já documentada no projeto: **35 arquivos, 234 testes aprovados**. Comandos equivalentes: `pnpm exec vitest run CAMINHO_DO_ARQUIVO --testTimeout=15000` para cada `src/**/*.test.ts(x)`. Os seis novos testes cobrem avanço, estado devolvido pela API, providência e preservação de texto, conflito sem repetição, loading/vazio/erro, relatório e acesso negado.

API: **257 testes aprovados**, incluindo integrações PostgreSQL, Flyway, concorrência e autorização; **package aprovado**. Front: **typecheck, lint e build aprovados**. O build foi executado com Node 22.19 disponível no host; o projeto declara Node 24. O aviso existente de chunk acima de 500 kB permanece.

Playwright: cenário completo aprovado com triagem real, geração, atribuição na UI, coleta em 390 px sem transbordamento, providência do atendente, entrega, reload, histórico com seis eventos/autores/horários e médias conferidas pelos timestamps da mesma ordem. API recusou operador alheio (403), transição inválida (409) e repetição de entrega (409). Um relatório intermediário confirmou coletaCount=1 e entregaCount=0. Nenhum erro JavaScript de página.

As evidências locais ficam em `.deploy-validation/svo-local/`: `unit-summary.json`, `scenario-evidence.json`, `browser-results.json`, logs de build/testes e capturas da coleta/indicadores. A evidência resumida versionada não contém credenciais, tokens ou dados reais.

## Arquivos principais

Front: `src/features/svo-orders/` (API, lista, detalhe, relatório e testes); `src/features/atendimento-svo/AtendimentoSvoPage.tsx`; `src/app/router.tsx` e `AppLayout.tsx`; acesso/perfis/início; contrato OpenAPI e tipos gerados; `e2e/svo-orders-local.*`; `scripts/test-svo-local.ps1` e `import-svo-order-contracts.mjs`.

Back: `SvoCollectionOrderService`, `SvoCollectionOrderController`, `SvoCollectionOrder`, `SvoOrderEvent`, DTOs/repositórios; snapshot do setor e travas na triagem; `V30__svo_collection_tracking.sql`; `SvoCollectionOrderIntegrationTests` e ajustes de expectativas/infraestrutura dos testes existentes.
