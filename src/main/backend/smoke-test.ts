import type { Supervisor } from './supervisor.js';
import type { BackendStatus, LogLine } from '../../shared/ipc/contract.js';
import { STARTUP_TIMEOUT_MS } from '../../shared/constants.js';

interface ProgressReporter {
  (percent: number | null, message: string): void;
}

export async function runSmokeTest(
  supervisor: Supervisor,
  report: ProgressReporter,
  signal?: AbortSignal,
): Promise<void> {
  const onLog = (line: LogLine): void => {
    if (line.stream !== 'app') return;
    report(null, line.text.trim().slice(0, 200));
  };

  let timeoutHandle: NodeJS.Timeout | null = null;
  let onStatus: ((s: BackendStatus) => void) | null = null;
  let onAbort: (() => void) | null = null;

  supervisor.on('log', onLog);

  const ready = new Promise<void>((resolve, reject) => {
    onStatus = (s) => {
      if (s.kind === 'ready') resolve();
      if (s.kind === 'crashed') reject(new Error(`backend crashed (code ${s.code})`));
    };
    supervisor.on('status', onStatus);
    timeoutHandle = setTimeout(
      () => reject(new Error('smoke-test timed out')),
      STARTUP_TIMEOUT_MS + 30_000,
    );
    if (signal) {
      onAbort = (): void => reject(new Error('aborted'));
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });

  try {
    report(null, 'launching backend for first-boot smoke test');
    await supervisor.start();
    await ready;
    report(null, 'backend reached ready; shutting down');
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    if (onStatus) supervisor.off('status', onStatus);
    supervisor.off('log', onLog);
    if (signal && onAbort) signal.removeEventListener('abort', onAbort);
    await supervisor.stop().catch(() => {});
  }
}
