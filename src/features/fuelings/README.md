# Abastecimentos

Duas telas na seção **Frota** da navegação:

- `/abastecimentos`: histórico com totais (registros, litros, valor e alertas), filtros por
  placa/modelo/posto, veículo, posto, combustível, período e "somente fora do padrão".
- `/abastecimentos/novo`: registro de abastecimento a partir do cupom fiscal.

## API

Contrato conferido com `FuelingController`, `CreateFuelingRequest`, `FuelingResponse` e
`PrimeFuelStationController` do backend (`integracao-staging-backend-20261125`). Esses
endpoints ainda não estão em `openapi/gestao-frotas.json`; as respostas são validadas com
Zod em `fuelings.api.ts` até o contrato ser regenerado.

- `GET /api/v1/fuelings` (FUELINGS_READ) ou `GET /api/v1/fuelings/mine` (FUELINGS_WRITE sem
  READ). A API devolve a lista inteira, sem paginação; filtros e paginação são locais.
- `POST /api/v1/fuelings` (FUELINGS_WRITE): `vehicleId`, `stationId`, `fueledOn`,
  `odometerKm`, `liters`, `totalValue`, `fuelType`.
- `GET /api/v1/fuel-stations?activeOnly=true` (FUEL_STATIONS_READ).
- `GET /api/v1/vehicles` para gestores ou `GET /api/v1/vehicles/me` para motoristas.

O backend calcula preço por litro, km rodados, consumo (km/L) e o alerta de consumo fora do
padrão. O registro não tem edição nem exclusão no backend.

## Validações

A interface antecipa as regras do servidor: data não futura, litros > 0 (até 3 casas),
valor > 0 (até 2 casas) e hodômetro não menor que o atual do veículo. A regra "maior que o
último abastecimento" é verificada apenas pelo servidor; a recusa aparece no formulário
sem perder os dados digitados.

Testes: `Fuelings.test.tsx`.
