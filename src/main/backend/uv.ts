import { existsSync } from 'node:fs';

export function resolveUvBinary(uvBinPath: string): string {
  if (!existsSync(uvBinPath)) {
    throw new Error(
      `uv binary not found at ${uvBinPath}. The setup wizard's "uv-bin" step downloads it; run the wizard.`,
    );
  }
  return uvBinPath;
}
