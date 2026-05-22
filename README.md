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
Legacy webview) is scaffolded; M2–M6 (setup wizard, native txt2img,
LoRAs + Gallery, polish, installer) are still to come.

## Dev

```sh
npm install
npm run dev
```

The dev script starts Vite, runs `tsc --watch` for the main process,
and launches Electron pointed at the Vite dev server. The Electron
window opens with the sidebar; click **Legacy UI → any tab** once a
Forge backend is running locally to verify the webview.

## Build

```sh
npm run build:win
```

Produces an NSIS installer under `release/`.

## Layout

- `src/main` — Electron main process: backend supervisor, IPC, install/setup
- `src/preload` — contextBridge surface exposed to the renderer
- `src/renderer` — React + Vite + Tailwind UI
- `src/shared` — zod schemas, IPC contract, path helpers, constants
- `resources/extension/forge-neo-api` — vendored Python extension that
  exposes `/sdapi/v1/loras` and friends
- `resources/model-manifests` — archived `download-*.json` manifests
  from the previous Pinokio setup, reused by the optional starter-model
  step in the setup wizard
