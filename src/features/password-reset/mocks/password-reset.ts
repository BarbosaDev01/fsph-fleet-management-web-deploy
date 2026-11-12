export const demoResetToken = 'recuperacao-demonstrativa';
export const demoResetPath = `/alterar-senha?token=${demoResetToken}`;

// Demonstration only: never sends, stores or changes passwords, tokens or sessions.
export async function loadDemoResetContext() {
  await new Promise((resolve) => setTimeout(resolve, 350));
  return { valid: true };
}

export async function simulatePasswordReset() {
  await new Promise((resolve) => setTimeout(resolve, 650));
}
