"""
forge-neo-api: thin extension that exposes routes the stock A1111 API lacks.

Currently registers:
  GET  /sdapi/v1/loras
  GET  /sdapi/v1/loras/{name}/preview
  GET  /sdapi/v1/embeddings-detailed

Failures here must never block backend startup. All registration runs inside
a try/except that logs to error.log next to this file.
"""

from __future__ import annotations

import json
import os
import traceback
from pathlib import Path

_ERR_LOG = Path(__file__).parent.parent / "error.log"


def _log_error(exc: BaseException) -> None:
    try:
        with _ERR_LOG.open("a", encoding="utf-8") as fh:
            fh.write(traceback.format_exc())
            fh.write("\n")
    except Exception:
        pass


def _register(app, *_args, **_kwargs):
    from fastapi import HTTPException
    from fastapi.responses import FileResponse, JSONResponse
    from modules import shared

    lora_dir = Path(getattr(shared.cmd_opts, "lora_dir", None) or os.path.join("models", "Lora"))

    def _list_loras():
        out = []
        if not lora_dir.exists():
            return out
        for p in lora_dir.rglob("*"):
            if p.suffix.lower() not in {".safetensors", ".ckpt", ".pt"}:
                continue
            sidecar_json = p.with_suffix(".json")
            sidecar_civitai = p.with_suffix(".civitai.info")
            preview = None
            for ext in (".preview.png", ".png", ".jpg", ".jpeg", ".webp"):
                cand = p.with_suffix(ext)
                if cand.exists():
                    preview = str(cand)
                    break
            metadata = None
            for sc in (sidecar_civitai, sidecar_json):
                if sc.exists():
                    try:
                        metadata = json.loads(sc.read_text(encoding="utf-8"))
                        break
                    except Exception:
                        pass
            out.append({
                "name": p.stem,
                "alias": p.stem,
                "path": str(p),
                "preview": preview,
                "metadata": metadata,
            })
        out.sort(key=lambda x: x["name"].lower())
        return out

    @app.get("/sdapi/v1/loras")
    def get_loras():
        return JSONResponse(_list_loras())

    @app.get("/sdapi/v1/loras/{name}/preview")
    def get_lora_preview(name: str):
        for entry in _list_loras():
            if entry["name"] == name and entry["preview"]:
                return FileResponse(entry["preview"])
        raise HTTPException(status_code=404, detail="preview not found")

    @app.get("/sdapi/v1/embeddings-detailed")
    def get_embeddings_detailed():
        from modules import sd_hijack
        try:
            loaded = sd_hijack.model_hijack.embedding_db.word_embeddings
        except Exception:
            loaded = {}
        return JSONResponse([
            {
                "name": name,
                "step": getattr(emb, "step", None),
                "sd_checkpoint": getattr(emb, "sd_checkpoint_name", None),
                "shape": getattr(emb, "shape", None),
                "vectors": getattr(emb, "vectors", None),
            }
            for name, emb in loaded.items()
        ])


def _on_app_started(_demo, app):
    try:
        _register(app)
    except Exception as exc:
        _log_error(exc)


try:
    from modules import script_callbacks
    script_callbacks.on_app_started(_on_app_started)
except Exception as exc:
    _log_error(exc)
