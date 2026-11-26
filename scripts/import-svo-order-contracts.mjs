import { readFileSync, writeFileSync } from 'node:fs';
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
  if (!/^\/api\/v1\/svo\/(?:orders(?:\/|$)|requests\/\{id\}\/order$)/.test(path)) continue;
  snapshot.paths[path] = structuredClone(operations);
  dependencies(snapshot.paths[path]);
}
// Explicit nullability mirrors the Java records and persisted stage timestamps.
const nullable = {
  SvoOrderResponse: [
    'deceasedName',
    'driverId',
    'driverName',
    'teamId',
    'teamName',
    'vehicleId',
    'vehiclePlate',
    'scheduledAt',
    'plannedReturnAt',
    'collectionDeadlineAt',
    'startedAt',
    'collectedAt',
    'deliveredAt',
    'requestToCollectionMinutes',
    'collectionToDeliveryMinutes',
    'requestToDeliveryMinutes',
  ],
  SvoOrderEventResponse: ['text', 'fromStatus'],
  SvoOrderReportResponse: [
    'averageRequestToCollectionMinutes',
    'averageCollectionToDeliveryMinutes',
    'averageRequestToDeliveryMinutes',
  ],
};
for (const name of imported) {
  const schema = snapshot.components.schemas[name];
  if (!schema?.properties) continue;
  if (
    [
      'SvoOrderResponse',
      'SvoOrderEventResponse',
      'SvoOrderReportResponse',
      'SvoOrderResourcesResponse',
      'PageResponseSvoOrderResponse',
      'Option',
    ].includes(name)
  ) {
    schema.required = Object.keys(schema.properties);
    for (const property of nullable[name] ?? [])
      schema.properties[property] = { anyOf: [schema.properties[property], { type: 'null' }] };
  }
}
const authoritySchema = live.components.schemas.CurrentUserResponse.properties.permissions.items;
const authorities = authoritySchema.enum ?? live.components.schemas.Permission?.enum ?? [];
snapshot.components.schemas.Permission.enum = [
  ...new Set([...snapshot.components.schemas.Permission.enum, ...authorities]),
];
writeFileSync(target, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`Imported SVO orders and ${imported.size} schemas.`);
