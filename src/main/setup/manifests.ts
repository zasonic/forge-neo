import { app } from 'electron';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ModelOption } from '../../shared/setup/steps.js';

interface RawManifest {
  run?: {
    method?: string;
    params?: { uri?: string; url?: string; dir?: string };
  }[];
}

function manifestsRoot(): string {
  if (app.isPackaged) return join(process.resourcesPath, 'model-manifests');
  return join(app.getAppPath(), 'resources', 'model-manifests');
}

/**
 * Hand-curated metadata for the starter-model picker. Manifest ids are
 * the file stems under resources/model-manifests/. The first five are
 * shown by default; the rest live behind a "Show all" toggle.
 */
const CURATED: { id: string; label: string; sizeGb: number; license: string; hidden?: boolean }[] = [
  { id: 'download-sdxl',             label: 'SDXL 1.0 base + refiner',  sizeGb: 13.0, license: 'OpenRAIL++' },
  { id: 'download-sd15',             label: 'DreamShaper 6.31 (SD 1.5)', sizeGb: 4.0,  license: 'CreativeML' },
  { id: 'download-flux1-dev-fp8',    label: 'Flux1-Dev FP8',             sizeGb: 12.0, license: 'flux-1-dev (non-commercial)' },
  { id: 'download-z-image-turbo',    label: 'Z-Image Turbo',             sizeGb: 9.0,  license: 'Apache-2.0' },
  { id: 'download-lcm-lora',         label: 'LCM LoRA (SDXL)',           sizeGb: 0.4,  license: 'OpenRAIL' },
  { id: 'download-turbo',            label: 'SDXL Turbo',                sizeGb: 6.5,  license: 'stability-ai-non-commercial', hidden: true },
  { id: 'download-flux1-dev-nf4-v2', label: 'Flux1-Dev nf4 v2',          sizeGb: 12.0, license: 'flux-1-dev (non-commercial)', hidden: true },
  { id: 'download-flux1-schnell-nf4',label: 'Flux1-Schnell nf4',         sizeGb: 12.0, license: 'Apache-2.0', hidden: true },
  { id: 'download-flux-kontext',     label: 'Flux Kontext (Nunchaku)',   sizeGb: 18.0, license: 'flux-1-dev (non-commercial)', hidden: true },
  { id: 'download-qwen-image',       label: 'Qwen-Image (Nunchaku)',     sizeGb: 24.0, license: 'qwen-research', hidden: true },
  { id: 'download-qwen-image-edit',  label: 'Qwen-Image-Edit (Nunchaku)', sizeGb: 24.0, license: 'qwen-research', hidden: true },
  { id: 'download-neta-lumina',      label: 'Neta-Lumina',                sizeGb: 8.0,  license: 'lumina', hidden: true },
  { id: 'download-netayume-lumina',  label: 'NetaYume-Lumina',            sizeGb: 8.0,  license: 'lumina', hidden: true },
  { id: 'download-wan2_1-t2v-1_3B',  label: 'Wan 2.1 T2V 1.3B',           sizeGb: 6.0,  license: 'apache-2.0', hidden: true },
  { id: 'download-wan2_2-t2v-14B',   label: 'Wan 2.2 T2V 14B',            sizeGb: 50.0, license: 'apache-2.0', hidden: true },
  { id: 'download-wan2_2-i2v-14B',   label: 'Wan 2.2 I2V 14B',            sizeGb: 50.0, license: 'apache-2.0', hidden: true },
];

function readManifest(id: string): { url: string; destRelative: string }[] {
  const path = join(manifestsRoot(), `${id}.json`);
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as RawManifest;
  const files: { url: string; destRelative: string }[] = [];
  for (const entry of raw.run ?? []) {
    if (entry.method !== 'fs.download') continue;
    const url = (entry.params?.uri ?? entry.params?.url ?? '').replace(/\?download=true$/, '');
    const dir = entry.params?.dir ?? '';
    if (!url || !dir) continue;
    // strip the leading "app/" — destinations are relative to paths.app.
    const destDir = dir.startsWith('app/') ? dir.slice('app/'.length) : dir;
    const filename = decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? 'download.bin');
    files.push({ url, destRelative: `${destDir}/${filename}` });
  }
  return files;
}

export function loadModelOptions(): ModelOption[] {
  const present = new Set(
    readdirSync(manifestsRoot())
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, '')),
  );
  const out: ModelOption[] = [];
  for (const c of CURATED) {
    if (!present.has(c.id)) continue;
    const files = readManifest(c.id);
    if (files.length === 0) continue;
    out.push({ id: c.id, label: c.label, sizeGb: c.sizeGb, license: c.license, files });
  }
  return out;
}

export const HIDDEN_BY_DEFAULT = new Set(CURATED.filter((c) => c.hidden).map((c) => c.id));
