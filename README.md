# Forge Neo

Native Electron frontend for
[sd-webui-forge-classic (neo branch)](https://github.com/Haoming02/sd-webui-forge-classic/tree/neo).

A hybrid UI: native React pages for the most-used flows (txt2img,
img2img, gallery, model + LoRA pickers) that talk to Forge's
`/sdapi/v1/*` HTTP API directly, plus a Legacy UI page that hosts the
existing Gradio in a sandboxed `<webview>` for the long tail
(extras, pnginfo, modelmerger, extensions, backend settings).

The Python backend is unchanged. We replace the Pinokio launcher +
in-browser Gradio with a single Windows app.

## Status

Day-one platform: Windows. Active branch:
`claude/electron-frontend-migration-xdUk5`. M1 (shell + supervisor +
Legacy webview), M1.1 (audit patches + pinned upstream SHA), M2 (setup
wizard) and M2.1 (PR readiness — install-time uv, generated icons,
GitHub Actions) are landed. M3–M6 (native txt2img, LoRAs + Gallery,
polish, installer signing + auto-update) still to come.

## Verifying a PR (no Windows machine required)

Every push to `main` or any `claude/**` branch — and every pull request
— triggers two CI workflows:

1. **`ci` (Ubuntu)** — typecheck, build, headless Electron boot under
   xvfb. Catches JS errors, missing imports, broken IPC wiring.
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
   a fast network. Lands on Legacy UI with the backend ready.

## Dev

```sh
npm install
npm run dev
```

Starts Vite, `tsc --watch` for the main process, and Electron pointed
at the Vite dev server. The window opens on `/setup/welcome` when no
install exists, or on `/legacy/txt2img` once installed.

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
  the first-run wizard; `pages/Legacy/LegacyFrame.tsx` is the
  sandboxed `<webview>` over the Gradio UI under `--subpath legacy`.
- `src/shared` — zod schemas, IPC contract, path helpers, pinned
  constants (UPSTREAM_SHA, PYTHON_*, UV_*, TORCH_INSTALL_SPECS).
- `resources/extension/forge-neo-api` — vendored Python extension
  that adds `/sdapi/v1/loras` and friends.
- `resources/model-manifests` — archived `download-*.json` manifests
  from the previous Pinokio setup, reused by the optional starter-model
  step.
- `scripts/generate-icon.ts` — one-shot jpeg → png/ico converter, run
  automatically by `prebuild`.
- `.github/workflows/` — CI and Windows installer build.
