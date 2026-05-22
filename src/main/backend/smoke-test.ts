import { Supervisor } from './supervisor.js';
import { resolveInstallPaths } from '../../shared/paths.js';
import { STARTUP_TIMEOUT_MS } from '../../shared/constants.js';

interface ProgressReporter {
  (percent: number | null, message: string): void;
}

export async function runSmokeTest(
  installRoot: string,
  report: ProgressReporter,
  signal?: AbortSignal,
): Promise<void> {
  const paths = resolveInstallPaths(installRoot);
  const supervisor = new Supervisor(paths);
  supervisor.on('log', (line) => {
    if (line.stream !== 'app') return;
    report(null, line.text.trim().slice(0, 200));
  });

  const ready = new Promise<void>((resolve, reject) => {
    supervisor.on('status', (s) => {
      if (s.kind === 'ready') resolve();
      if (s.kind === 'crashed') reject(new Error(`backend crashed (code ${s.code})`));
    });
    setTimeout(() => reject(new Error('smoke-test timed out')), STARTUP_TIMEOUT_MS + 30_000);
    signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });

  try {
    report(null, 'launching backend for first-boot smoke test');
    await supervisor.start();
    await ready;
    report(null, 'backend reached ready; shutting down');
  } finally {
    await supervisor.stop().catch(() => {});
  }
}
