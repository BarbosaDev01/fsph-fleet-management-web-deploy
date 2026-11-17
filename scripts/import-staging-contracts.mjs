import { readFileSync, writeFileSync } from 'node:fs';

// Import only the canonical travel contracts. Never overwrite the legacy Route/Transport DTOs.
// Source: public Springdoc of LIVE backend c804cb1, retrieved on 2026-11-16.
const source = process.argv[2];
if (!source) throw new Error('Provide the downloaded staging OpenAPI JSON.');
const live = JSON.parse(readFileSync(source, 'utf8').replace(/^\uFEFF/, ''));
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
  if (!/^\/api\/v1\/trip(?:s|-requests)(?:\/|$)/.test(path)) continue;
  snapshot.paths[path] = structuredClone(operations);
  dependencies(snapshot.paths[path]);
}
// Springdoc omits response requiredness. These core fields are non-null in the published Java
// record/entity. Optional decision/assignment fields remain optional and explicitly nullable.
const requiredResponses = {
  TripRequestResponse: [
    'id',
    'requesterId',
    'departureAt',
    'expectedReturnAt',
    'origin',
    'destination',
    'purpose',
    'passengerCount',
    'status',
  ],
  TripRequestAvailabilityResponse: [
    'tripRequestId',
    'departureAt',
    'expectedReturnAt',
    'passengerCount',
    'requestedVehicleAvailable',
    'availableVehicles',
    'availableDrivers',
  ],
  EligibleVehicleResponse: [
    'id',
    'plate',
    'model',
    'totalCapacity',
    'availablePassengerSeats',
    'usageType',
    'currentOdometerKm',
  ],
  AvailableDriverResponse: ['driverId', 'userId', 'name', 'email'],
  TripResponse: ['id', 'vehicleId', 'driverId', 'startedAt', 'initialOdometerKm', 'status'],
  TripHistoryResponse: ['content', 'page', 'size', 'totalElements', 'totalPages'],
};
for (const [name, required] of Object.entries(requiredResponses)) {
  const definition = snapshot.components.schemas[name];
  if (!definition) continue;
  definition.required = required;
  for (const [key, property] of Object.entries(definition.properties)) {
    if (!required.includes(key)) property.nullable = true;
  }
}
const me = snapshot.components.schemas.CurrentUserResponse;
me.properties.permissions = { type: 'array', items: { type: 'string' } };
me.properties.sectorId.nullable = true;
me.required = [...new Set([...me.required, 'permissions'])];
// Preserve unknown authorities in session/editor instead of silently dropping future grants.
snapshot.components.schemas.ReplacePermissionsRequest.properties.permissions.items = {
  type: 'string',
};
for (const path of ['/api/v1/roles/permissions', '/api/v1/roles/{role}/permissions']) {
  for (const operation of Object.values(snapshot.paths[path])) {
    for (const response of Object.values(operation.responses ?? {})) {
      const schema = response.content?.['application/json']?.schema;
      if (schema?.additionalProperties?.items)
        schema.additionalProperties.items = { type: 'string' };
      if (schema?.items) schema.items = { type: 'string' };
    }
  }
}
writeFileSync(target, JSON.stringify(snapshot, null, 2) + '\n');
console.log(
  `Imported canonical travel paths and ${imported.size} referenced schemas; legacy paths preserved.`,
);
