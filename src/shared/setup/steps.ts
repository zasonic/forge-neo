export type SetupStepId =
  | 'preflight'
  | 'install-python'
  | 'fetch-source'
  | 'create-venv'
  | 'pip-bootstrap'
  | 'pip-clip'
  | 'pip-torch'
  | 'pip-deepspeed'
  | 'pip-bitsandbytes'
  | 'pip-nunchaku'
  | 'pip-triton'
  | 'pip-sage'
  | 'first-launch'
  | 'pip-hfxet'
  | 'install-extension'
  | 'download-models'
  | 'finalize';

export interface SetupStep {
  id: SetupStepId;
  label: string;
  optional?: boolean;
}

export const SETUP_STEPS: readonly SetupStep[] = [
  { id: 'preflight', label: 'Check system' },
  { id: 'install-python', label: 'Install Python 3.11 (uv-managed)' },
  { id: 'fetch-source', label: 'Download Forge source' },
  { id: 'create-venv', label: 'Create virtual environment' },
  { id: 'pip-bootstrap', label: 'Install wheel + setuptools + pip' },
  { id: 'pip-clip', label: 'Install OpenAI CLIP' },
  { id: 'pip-torch', label: 'Install torch + torchvision + torchaudio + xformers' },
  { id: 'pip-deepspeed', label: 'Install DeepSpeed' },
  { id: 'pip-bitsandbytes', label: 'Install bitsandbytes' },
  { id: 'pip-nunchaku', label: 'Install Nunchaku' },
  { id: 'pip-triton', label: 'Install Triton (Windows)' },
  { id: 'pip-sage', label: 'Install SageAttention' },
  { id: 'first-launch', label: 'Forge first-launch (resolve dependencies)' },
  { id: 'pip-hfxet', label: 'Install hf-xet' },
  { id: 'install-extension', label: 'Install Forge Neo extension' },
  { id: 'download-models', label: 'Download starter models', optional: true },
  { id: 'finalize', label: 'Finalize installation' },
] as const;

export type SetupOverallState =
  | 'idle'
  | 'preflight'
  | 'running'
  | 'done'
  | 'failed'
  | 'cancelled';

export type StepStatus = 'pending' | 'active' | 'done' | 'error' | 'skipped';

export interface StepProgress {
  value: number;
  total?: number;
  unit?: 'bytes' | 'count';
}

export interface StepReport {
  id: SetupStepId;
  status: StepStatus;
  message?: string;
  progress?: StepProgress;
}

export interface SetupProgressEvent {
  overall: SetupOverallState;
  currentStep: SetupStepId | null;
  steps: StepReport[];
}

export interface ModelOption {
  id: string;
  label: string;
  sizeGb: number;
  license: string;
  files: { url: string; destRelative: string }[];
}

export interface ModelSelection {
  ids: string[];
}

export interface PreflightReport {
  freeDiskGb: number | null;
  minFreeDiskGb: number;
  driverVersion: string | null;
  minDriverVersion: number;
  gpuName: string | null;
  totalRamGb: number | null;
  network: { github: boolean; huggingface: boolean; pytorch: boolean };
  ok: boolean;
  warnings: string[];
}
