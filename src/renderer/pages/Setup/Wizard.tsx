import { useEffect, useState, type ReactElement } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import type { StepName } from '@shared/constants.js';
import { useInstaller } from '../../hooks/useInstaller.js';
import { SetupLayout } from './Layout.js';
import { StepPanel } from './StepPanel.js';

const STEP_PATHS: Record<string, StepName> = {
  welcome: 'welcome',
  preflight: 'preflight',
  python: 'python-runtime',
  uv: 'uv-bin',
  venv: 'venv',
  repo: 'repo',
  torch: 'torch',
  extension: 'extension',
  'smoke-test': 'smoke-test',
  done: 'done',
};

export function SetupWizard(): ReactElement {
  const installer = useInstaller();
  const navigate = useNavigate();

  const done = installer.done;
  const currentStep = installer.current;

  useEffect(() => {
    if (done) {
      navigate('/legacy/txt2img', { replace: true });
    }
  }, [done, navigate]);

  useEffect(() => {
    if (!currentStep) return;
    const route = Object.entries(STEP_PATHS).find(([, step]) => step === currentStep);
    if (route) navigate(`/setup/${route[0]}`, { replace: true });
  }, [currentStep, navigate]);

  const lastCompleted = installer.state?.lastCompletedStep ?? null;

  return (
    <SetupLayout lastCompleted={lastCompleted}>
      <Routes>
        <Route index element={<Navigate to="welcome" replace />} />
        <Route path="welcome" element={<WelcomePage installer={installer} />} />
        <Route path="preflight" element={<RunStep installer={installer} step="preflight" title="Preflight checks" intro="Verifying NVIDIA driver and disk space." />} />
        <Route path="python" element={<RunStep installer={installer} step="python-runtime" title="Python runtime" intro="Downloading Python 3.11 standalone and verifying SHA256." />} />
        <Route path="uv" element={<RunStep installer={installer} step="uv-bin" title="uv" intro="Downloading the uv package manager binary." />} />
        <Route path="venv" element={<RunStep installer={installer} step="venv" title="Virtualenv" intro="Creating venv with uv and installing the base pin set." />} />
        <Route path="repo" element={<RunStep installer={installer} step="repo" title="Forge source" intro="Downloading the upstream sd-webui-forge-classic source tarball." />} />
        <Route path="torch" element={<RunStep installer={installer} step="torch" title="Torch + GPU stack" intro="Installing torch / xformers / triton / sageattention / deepspeed / nunchaku / bitsandbytes. This is the long one." />} />
        <Route path="extension" element={<RunStep installer={installer} step="extension" title="forge-neo-api extension" intro="Copying the vendored extension that exposes /sdapi/v1/loras and friends." />} />
        <Route path="smoke-test" element={<RunStep installer={installer} step="smoke-test" title="First boot" intro="Launching Forge once to confirm the install is healthy." />} />
        <Route path="done" element={<DonePage installer={installer} />} />
        <Route path="*" element={<Navigate to="welcome" replace />} />
      </Routes>
    </SetupLayout>
  );
}

function WelcomePage({ installer }: { installer: ReturnType<typeof useInstaller> }): ReactElement {
  const [root, setRoot] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    void window.forge.settings.get().then((s) => setRoot(s.installRoot));
  }, []);

  const pickRoot = async (): Promise<void> => {
    const chosen = await window.forge.dialog.openDirectory();
    if (!chosen) return;
    await window.forge.settings.set({ installRoot: chosen });
    setRoot(chosen);
  };

  const begin = async (): Promise<void> => {
    await installer.start();
    navigate('/setup/preflight');
  };

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Welcome to Forge Neo</h1>
        <p className="text-white/60 mt-2">
          This wizard installs a private Python 3.11 runtime, the
          sd-webui-forge-classic source, and the GPU stack into the directory
          below. The install is resumable — if anything fails you can pick up
          where you left off.
        </p>
      </header>
      <section className="space-y-2">
        <label className="text-sm text-white/70">Install root</label>
        <div className="flex gap-2">
          <input
            readOnly
            value={root ?? 'loading…'}
            className="flex-1 px-3 py-2 rounded bg-bg-panel border border-border text-sm"
          />
          <button
            onClick={() => void pickRoot()}
            className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
          >
            Browse…
          </button>
        </div>
        <div className="text-xs text-white/40">
          Existing data here will be preserved. Models, outputs, and settings
          live alongside the runtime.
        </div>
      </section>
      <section className="flex justify-end">
        <button
          onClick={() => void begin()}
          disabled={!root}
          className="px-4 py-2 rounded bg-accent text-accent-fg disabled:opacity-50"
        >
          Begin install
        </button>
      </section>
    </div>
  );
}

function RunStep({
  installer,
  step,
  title,
  intro,
}: {
  installer: ReturnType<typeof useInstaller>;
  step: StepName;
  title: string;
  intro: string;
}): ReactElement {
  const stream = installer.streams[step];
  const failed = stream?.error;
  const running = installer.current === step;

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-white/60 mt-2">{intro}</p>
      </header>
      <StepPanel stream={stream} emptyMessage="Waiting to start…" />
      {failed && (
        <div className="flex gap-2">
          <button
            onClick={() => void installer.start(step)}
            className="px-4 py-2 rounded bg-accent text-accent-fg"
          >
            Retry this step
          </button>
          {step === 'python-runtime' && <ByoPythonField installer={installer} />}
        </div>
      )}
      {running && (
        <button
          onClick={() => void installer.cancel()}
          className="px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
        >
          Cancel
        </button>
      )}
    </div>
  );
}

function ByoPythonField({ installer }: { installer: ReturnType<typeof useInstaller> }): ReactElement {
  const [path, setPath] = useState('');
  return (
    <div className="flex items-center gap-2">
      <input
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="C:\\Python311\\python.exe"
        className="px-3 py-2 rounded bg-bg-panel border border-border text-sm w-72"
      />
      <button
        onClick={() => void installer.setByoPython(path || null).then(() => installer.start('python-runtime'))}
        className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
      >
        Use this Python
      </button>
    </div>
  );
}

function DonePage({ installer }: { installer: ReturnType<typeof useInstaller> }): ReactElement {
  const navigate = useNavigate();
  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">All set</h1>
        <p className="text-white/60 mt-2">
          Install complete. The backend will start automatically next launch
          (toggle this in Settings).
        </p>
      </header>
      <button
        onClick={() => navigate('/legacy/txt2img', { replace: true })}
        className="px-4 py-2 rounded bg-accent text-accent-fg"
      >
        Open Legacy UI
      </button>
      <div className="text-xs text-white/40">
        Need to start over? Reset is available under Settings.
      </div>
      <div className="text-xs text-white/30 mt-4">
        Installed SHA: {installer.state?.upstreamSha?.slice(0, 12) ?? 'pending'}
      </div>
    </div>
  );
}
