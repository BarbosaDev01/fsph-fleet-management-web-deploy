export const demoSectors = [
  { id: 'demo-administracao', name: 'Administração' },
  { id: 'demo-svo', name: 'Serviço de Verificação de Óbito' },
  { id: 'demo-transporte', name: 'Transportes' },
];

export async function loadDemoSectors() {
  await new Promise((resolve) => setTimeout(resolve, 350));
  return demoSectors;
}

// No credentials or personal data are stored or sent in demonstration mode.
export async function simulateRegistration() {
  await new Promise((resolve) => setTimeout(resolve, 650));
}
