# Integração de cartões e triagem SVO — 19/11/2026

A base funcional é a release do fork de deploy `release/staging-frontend-20261119`
(`143a2f2`). A CLI autenticada confirmou que o alias público apontava para
`dpl_3NqRoHzyte5XKfHxJELAvakyJPC9`, código `029dd68` da mesma release; os commits
seguintes eram documentação. O checkout inicial `feat/perfis-cadastro-acessos-20261118`
estava limpo. A implementação usa a branch própria
`feat/api-fuel-cards-svo-20261119`, sem alterar os outros worktrees ou a main oficial.

## Contrato conferido

- Backend oficial: `main` em `b7b430c4d6c5d6c0a09b43cf06331b7c23538179`.
- Render: `srv-dbn0cg0u01pc73fpooqg`, workspace confirmado pelo usuário
  `tea-dbkhptm7bikc73a946p0`, branch `perf/staging-deploy-login-20261111`, deploy
  `dep-dbvik6ivcj2c73d2a6e0`, commit `913ae68452f67379926ce2bffcd6966a4cc4f85a`, live.
- Controllers, DTOs, enums, modelos e regras de cartões/SVO foram lidos na fonte
  Java e comparados à main atualizada e ao OpenAPI público do Render.
- Os contratos dos dois módulos são iguais. O Render contém correções adicionais
  de EntityGraph e tipagem de filtros nulos no PostgreSQL: afetam consultas/listas
  de cartões e SVO, incluindo detalhe e consultas por número/protocolo/solicitante.
  Não é necessário atualizar o Render para esta integração. Nenhum deploy backend,
  migration, CORS, permissão de perfil existente ou variável remota foi alterado.
- O snapshot OpenAPI importa somente cartões/SVO e dependências, preservando os
  contratos anteriores. Pageable é descrito como objeto pelo Springdoc; a geração
  adapta para parâmetros planos `page`, `size`, `sort`, usados pelo Spring MVC.

## Comportamento entregue

`/cartoes-combustivel`: adaptador real da interface FuelCardsRepository, lista com
filtros/paginação, GET de detalhe independente da página, cadastro, edição dos
campos aceitos, status, vínculo e desvínculo. O DELETE remove apenas a associação.
Titular, notas, saldo e data civil são respeitados; o número não é enviado no PUT.
Valores zero são preservados. Setor não existe no resumo de veículo do contrato e
é indicado como não informado. Veículos ativos vêm da API de veículos.

`/atendimento-svo`: fila real com paginação e filtro de status, detalhe do registro,
contagem por `totalElements` de `PENDING_TRIAGE` em consulta separada de tamanho 1.
Aprovar envia `approved:true`; rejeitar exige motivo de até 500 caracteres.
Suspeita de violência impede aprovação conforme o serviço. Sucesso atualiza o
registro, a fila e a contagem. HTTP 400/409 dispara consulta do estado atual; só
informa conflito se confirmar que o registro deixou de estar pendente.

Consulta geral exige SVO_REQUESTS_READ. Com apenas SVO_REQUESTS_WRITE são usadas
as próprias solicitações em `/my-requests`, sem contador ou filtros globais. As
decisões exigem SVO_REQUESTS_MANAGE. Não se presume consulta geral por MANAGE.
As referências demonstrativas permanecem isoladas, incluindo o componente SVO
original renomeado; complemento, análise simulada e geração de rotas não aparecem
na operação. A antiga análise de viagens foi preservada em `/analise-viagens`, com
seus acessos e atalhos atualizados. Os novos módulos constam no menu e no início.

Os clientes reutilizam JWT, URL base, tratamento de 401 e Problem Details. O
cliente remove o sufixo /api da base; as rotas incluem /api/v1 uma única vez.
Falhas exibem erro e preservam o formulário. Uma gravação confirmada cujo refresh
falhou é informada como gravada, sem repetição automática da escrita.

## Validação

O teste executável é `e2e/operations-real.spec.ts`, configuração dedicada
`e2e/operations-real.config.ts`. Exige STAGING_ADMIN_EMAIL/STAGING_ADMIN_PASSWORD e
OPERATIONS_ALLOW_WRITES=true. Para o build local, OPERATIONS_LOCAL_ARTIFACT aponta
para o preview local: somente arquivos frontend são servidos sob a origem
permitida da homologação. Nenhuma chamada de API é interceptada ou simulada.

Confirmado com frontend local e API Render real: cadastro e edição de cartão,
vínculo e desvínculo, status Bloqueado e valores/data após reload; aprovação e
rejeição de duas solicitações fictícias, fila/contador após reload; perfil EMPLOYEE
consultando os próprios registros, triagem negada pelo servidor (403), cartões
bloqueados. Layout em 390 px sem transbordamento e nenhum erro JS de página.

O ambiente não possui perfil padrão com SVO_REQUESTS_READ sem MANAGE: essa
combinação é coberta por teste automatizado local. O teste real sem gerenciamento
usa EMPLOYEE, com consulta limitada aos próprios registros. Nenhuma matriz de
permissões existente foi modificada para viabilizar o teste.

Os dados criados são identificados como fictícios. Ao terminar, os cartões ficam
Cancelados e desvinculados; os veículos e usuários de teste ficam inativos. As
duas decisões SVO permanecem como evidência, sem conteúdo de ocorrência real.
Credenciais, JWTs e dados de sessão não integram o código ou as evidências.

Limite do contrato: não há ETag/versionamento no PUT do cartão nem controle
atômico de concorrência exposto na triagem. O front trata a recusa de registro já
triado; não pode garantir exclusão mútua entre PATCHs exatamente simultâneos.

A publicação e os resultados finais estão registrados no arquivo de evidência
`docs/evidencias/integracao-cartoes-svo-20261119.json`.

## Resultado publicado

- Branch: `feat/api-fuel-cards-svo-20261119`, enviada ao fork de deploy.
- Código publicado: `ba795e7d5808f7268ef1b116dc7e14c0ca34ee33`.
- Vercel: `dpl_6zoBG88H4ThDwMQ9n2V9Kyeojx1g`, Production do projeto exclusivo de
  homologação `fsph-fleet-web-staging`, READY e promovido sem rebuild.
- Alias conferido: https://fsph-fleet-web-staging.vercel.app aponta para esse deployment.
- Artefato conferido antes da promoção: origem Render correta, rotas operacionais,
  Node 24.x e Vite. Nenhuma configuração remota alterada.
- Build, TypeScript, lint e formatação aprovados. Todos os 34 arquivos de teste
  unitário passaram em processos isolados, conforme estratégia local já existente,
  com timeout de 15 s. São 228 testes: o primeiro lote de 226 foi complementado
  pela ampliação e reexecução bem-sucedida da suíte SVO (6 para 8).
- Seis testes Playwright existentes de cartões/demonstração aprovados, incluindo
  fluxos e tamanhos de tela de 1440, 820 e 390 px.
- Fluxo com front local e API real aprovado. Depois da promoção, o mesmo teste
  passou na URL pública, sem interceptar frontend ou backend: cartão cadastrado,
  editado, vinculado, desvinculado, bloqueado e recarregado; SVO aprovado e rejeitado,
  fila recarregada e contador conferido; EMPLOYEE consultando registros próprios,
  PATCH de triagem negado (403) e acesso ao módulo de cartões bloqueado. Layout
  de 390 px sem transbordamento e zero erros JavaScript de página.
- Somente local: combinação READ sem MANAGE para consulta global SVO, contador de
  mais de uma página, conflito de triagem e falhas de formulário/refresh. A matriz
  padrão da homologação não oferece um perfil READ sem MANAGE; não foi modificada.
- Render reconferido após a publicação: mesmo commit `913ae684`, live. Nenhuma
  atualização backend necessária para os contratos usados.

O commit posterior de documentação registra as evidências e não altera o código
publicado nem dispara outro deploy.
