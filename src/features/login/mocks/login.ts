export const demoCredentials = {
  email: 'usuario@orgao.gov.br',
  password: 'Demo@123',
};

// Isolated demonstration: never issues tokens or persists credentials.
export async function simulateLogin(values: { email: string; password: string }) {
  await new Promise((resolve) => setTimeout(resolve, 650));
  if (
    values.email.toLowerCase() !== demoCredentials.email ||
    values.password !== demoCredentials.password
  ) {
    throw new Error(
      'E-mail ou senha inválidos. Confira os dados demonstrativos e tente novamente.',
    );
  }
}
