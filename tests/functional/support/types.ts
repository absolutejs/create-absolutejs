export type StepResult = {
  readonly success: boolean;
  readonly elapsedMs: number;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
};

export const createFailure = (errors: string[], elapsedMs: number, warnings: string[] = []): StepResult => ({
  elapsedMs,
  errors,
  success: false,
  warnings
});

export const createSuccess = (
  elapsedMs: number,
  warnings: string[] = []
): StepResult => ({
  elapsedMs,
  errors: [],
  success: true,
  warnings
});

