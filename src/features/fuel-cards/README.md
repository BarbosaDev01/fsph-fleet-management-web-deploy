# Cartões de combustível

O módulo operacional fica em `/cartoes-combustivel`, na navegação normal, e usa a
API real sem depender de `VITE_FUEL_CARDS_DEMO`. Consulta exige `FUEL_CARDS_READ`;
cadastro, edição, status e vínculos exigem também `FUEL_CARDS_WRITE`. A seleção de
veículos usa a API existente e respeita `VEHICLES_READ`.

O adaptador `data/api-repository.ts` implementa `FuelCardsRepository` com o cliente
HTTP/JWT e Problem Details compartilhados. Listagem usa paginação Spring e filtros
`search`, `status` e `vehicleId`. Detalhes usam GET por ID, independentemente da
página atual. POST/PUT/PATCH/DELETE só mostram confirmação após a resposta da API;
falhas mantêm o formulário. DELETE em `bind-vehicle` remove apenas o vínculo.

O número é uma string de 4 a 50 caracteres e não pode ser editado pelo PUT.
Titular é obrigatório; validade é uma data civil completa. Valores monetários
aceitam zero e até duas casas decimais, convertidos para números JSON. Na criação,
saldo vazio usa o limite como saldo inicial, conforme a regra do servidor. Na
edição, saldo é obrigatório e vem preenchido com o valor consultado. Não há saldo
calculado a partir de dados de exemplo. O contrato não informa setor no resumo do
veículo; a interface explicita essa ausência.

A referência demonstrativa permanece separada em
`/demonstracoes/cartoes-combustivel`, somente com `VITE_APP_ENV=staging` e
`VITE_FUEL_CARDS_DEMO=true`. Não é fallback para falhas da integração real.

Regressões: `api-repository.test.ts`, `FuelCardsApi.test.tsx` e suítes demonstrativas
preservadas. O fluxo com API real está em `e2e/operations-real.spec.ts`; exige
credenciais locais, autorização explícita de escrita e a configuração dedicada
`e2e/operations-real.config.ts`. Dados de teste são identificados como fictícios;
cartão, usuário e veículo de teste são desativados no encerramento. As decisões SVO
permanecem para evidenciar a persistência.
