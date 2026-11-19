import { readFileSync, writeFileSync } from 'node:fs';

// Import the published Springdoc contracts for cards and SVO only. Preserve the
// legacy travel contracts and the frontend's deliberately open authority lists.
const live = JSON.parse(readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, ''));
const target = 'openapi/gestao-frotas.json';
const snapshot = JSON.parse(readFileSync(target, 'utf8'));
const imported = new Set();
function dependencies(value) {
  if (!value || typeof value !== 'object') return;
  if (value.$ref?.startsWith('#/components/schemas/')) {
    const name = value.$ref.split('/').at(-1);
    if (!imported.has(name)) {
      imported.add(name);
      snapshot.components.schemas[name] = structuredClone(live.components.schemas[name]);
      dependencies(snapshot.components.schemas[name]);
    }
  }
  Object.values(value).forEach(dependencies);
}
for (const [path, operations] of Object.entries(live.paths)) {
  if (!/^\/api\/v1\/(?:fuel-cards|svo\/requests)(?:\/|$)/.test(path)) continue;
  snapshot.paths[path] = structuredClone(operations);
  // Springdoc describes Pageable as an object, but Spring MVC binds flat query
  // parameters (page=0&size=20&sort=createdAt,desc), not pageable[page].
  for (const operation of Object.values(snapshot.paths[path])) {
    if (!operation.parameters) continue;
    operation.parameters = operation.parameters.flatMap((parameter) =>
      parameter.name === 'pageable'
        ? [
            { name: 'page', in: 'query', schema: { type: 'integer', minimum: 0 } },
            { name: 'size', in: 'query', schema: { type: 'integer', minimum: 1 } },
            { name: 'sort', in: 'query', schema: { type: 'array', items: { type: 'string' } } },
          ]
        : [parameter],
    );
  }
  dependencies(snapshot.paths[path]);
}
// Java records/entities guarantee these fields; Springdoc does not mark them.
const required = {
  FuelCardResponse: [
    'id',
    'cardNumber',
    'cardholderName',
    'status',
    'totalLimit',
    'availableBalance',
    'expirationDate',
  ],
  FuelCardVehicleSummaryResponse: ['id', 'plate', 'model'],
  SvoDeathRequestResponse: [
    'id',
    'protocolNumber',
    'requesterId',
    'requesterName',
    'requesterEmail',
    'occurredAt',
    'deathLocationType',
    'address',
    'neighborhood',
    'city',
    'contactName',
    'contactPhone',
    'hasSuspectedViolence',
    'status',
    'createdAt',
  ],
  PageFuelCardResponse: ['content', 'number', 'size', 'totalElements', 'totalPages'],
  PageSvoDeathRequestResponse: ['content', 'number', 'size', 'totalElements', 'totalPages'],
};
for (const [name, fields] of Object.entries(required)) {
  const schema = snapshot.components.schemas[name];
  schema.required = fields;
  for (const [key, property] of Object.entries(schema.properties)) {
    if (!fields.includes(key)) property.nullable = true;
  }
}
snapshot.components.schemas.Permission.enum = [
  ...new Set([
    ...snapshot.components.schemas.Permission.enum,
    ...live.components.schemas.CurrentUserResponse.properties.permissions.items.enum,
  ]),
];
writeFileSync(target, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`Imported cards/SVO and ${imported.size} schemas.`);
