# Forge Neo

Native Electron frontend for
[sd-webui-forge-classic (neo branch)](https://github.com/Haoming02/sd-webui-forge-classic/tree/neo).

A single Windows app that owns install, launch, and the entire UI. The
shipped product has no Gradio webview — every page is React talking to
Forge's `/sdapi/v1/*` HTTP API (and a few `/forge-neo/*` routes from the
bundled extension) directly.

The Python backend itself is unchanged.

## Status

Day-one platform: Windows.

- **M1** Electron shell + backend supervisor (no Pinokio launcher)
- **M2** First-run setup wizard (uv-managed Python 3.11, pinned upstream
  source, torch + GPU stack, vendored extension)
- **M3** Native txt2img + Models pages
- **M4** Native Gallery page with PNG metadata extraction
- **M5** Native Extras, PNG Info, Model Merger, Extensions, Settings;
  Legacy webview retired

Img2Img + LoRAs and the M6 distribution track (code signing +
auto-update + GitHub Releases) are still to come.

## Sidebar

- **Generate**: txt2img, Extras (upscale + face restore), PNG Info
- **Library**: Gallery, Models
- **Advanced**: Model Merger, Extensions, Settings (App / Backend)

Each page calls the Forge HTTP API directly. The Model Merger,
Extensions toggle, options-schema discovery, and LoRAs refresh routes
live in the bundled `forge-neo-api` Python extension under
`/forge-neo/*` to keep them clearly distinct from upstream `/sdapi/v1/*`.

## Verifying a PR (no Windows machine required)

Every push to `main` or any `claude/**` branch — and every pull request
— triggers two CI workflows:

1. **`ci` (Ubuntu)** — typecheck, lint, vitest, build, headless
   Electron boot under xvfb. Catches JS errors, missing imports,
   broken IPC wiring.
2. **`build-windows` (Windows)** — runs `npm run build:win` on a
   Windows runner and uploads the NSIS installer as a downloadable
   artifact named `forge-neo-windows-<sha>`.

To verify a PR end-to-end:

1. Wait for both checks to go green on the PR page.
2. Click the `build-windows` job → **Artifacts** → download
   `forge-neo-windows-<sha>.zip` → unzip → run `Forge Neo Setup
   <version>.exe` on any Windows machine.
3. Walk the first-run wizard. The installer downloads Python 3.11,
   the `uv` binary, the sd-webui-forge-classic source (pinned SHA),
   torch / xformers / triton / sageattention / deepspeed / nunchaku /
   bitsandbytes, and the vendored extension. Total ~10–15 minutes on
   a fast network.
4. The app lands on txt2img with the backend warming up. Confirm:
   - Generate a small SD1.5 image from txt2img.
   - Open Gallery → click a result → "Send to txt2img" → generate.
   - Open Extras → drop an image → upscale 2x with R-ESRGAN.
   - Open PNG Info → drop a generated PNG → see prompt + params.
   - Open Settings → Backend tab → tweak Clip skip → Apply.
   - Open Extensions → toggle one off → restart backend on prompt.

## Just want to run it?

If you downloaded the source and only want to try the app (no
terminal, no commands), open the folder in Windows File Explorer and
double-click:

```
START HERE - Run Forge Neo.bat
```

It checks for Node.js, installs dependencies the first time, and
launches the Electron app. Node.js 20 or newer is required — install
it from https://nodejs.org if the launcher tells you it's missing.
See `START HERE - Read Me First.txt` in the repo root for the same
guidance in plain text.

## Dev

```sh
npm install
npm run dev
```

Starts Vite, `tsc --watch` for the main process, and Electron pointed
at the Vite dev server. The window opens on `/setup/welcome` when no
install exists, or on `/generate/txt2img` once installed.

## Build

```sh
npm run build:win
```

Produces an NSIS installer under `release/`. The `prebuild` script
regenerates `resources/icons/icon.{png,ico}` from `icon.jpeg` if the
source is newer.

## Layout

- `src/main` — Electron main process: backend supervisor, installer
  state machine, IPC, custom protocols.
- `src/preload` — contextBridge surface exposed to the renderer.
- `src/renderer` — React + Vite + Tailwind UI. `pages/Setup/*` hosts
  the first-run wizard; the rest are native pages that call
  `/sdapi/v1/*` (and a few `/forge-neo/*`) over fetch with zod
  validation.
- `src/shared` — zod schemas, IPC contract, path helpers, pinned
  constants (UPSTREAM_SHA, PYTHON_*, UV_*, TORCH_INSTALL_SPECS).
- `resources/extension/forge-neo-api` — vendored Python extension
  that adds `/sdapi/v1/loras`, `/sdapi/v1/embeddings-detailed`, and
  the `/forge-neo/*` namespace (options-schema, modelmerger, extension
  toggle, refresh-loras).
- `resources/model-manifests` — archived `download-*.json` manifests
  from the previous Pinokio setup, reused by the optional starter-model
  step.
- `scripts/generate-icon.ts` — one-shot jpeg → png/ico converter, run
  automatically by `prebuild`.
- `.github/workflows/` — CI and Windows installer build.
