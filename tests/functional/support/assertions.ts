import { type StepResult } from './types';

export const assertStepSuccess = (result: StepResult, context: string) => {
  if (result.success) {
    return;
  }

  const message = [
    `${context} failed`,
    ...result.errors.map((error) => `- ${error}`),
    ...result.warnings.map((warning) => `⚠ ${warning}`)
  ].join('\n');

  throw new Error(message);
};

export const logWarnings = (result: StepResult) => {
  result.warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
};

