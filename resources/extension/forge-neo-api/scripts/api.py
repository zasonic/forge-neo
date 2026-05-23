"""
forge-neo-api: thin extension that exposes routes the stock A1111 API lacks.

Currently registers:
  GET  /sdapi/v1/loras
  GET  /sdapi/v1/loras/{name}/preview
  GET  /sdapi/v1/embeddings-detailed
  GET  /forge-neo/options-schema
  POST /forge-neo/modelmerger
  POST /forge-neo/extensions/{name}/toggle
  POST /forge-neo/refresh-loras

Failures here must never block backend startup. All registration runs inside
a try/except that logs to error.log next to this file.
"""

from __future__ import annotations

import json
import os
import traceback
from pathlib import Path

_ERR_LOG = Path(__file__).resolve().parents[1] / "error.log"


def _log_error(exc: BaseException) -> None:
    try:
        with _ERR_LOG.open("a", encoding="utf-8") as fh:
            fh.write(traceback.format_exc())
            fh.write("\n")
    except Exception:
        pass


def _json_safe(v) -> bool:
    if v is None or isinstance(v, (bool, int, float, str)):
        return True
    if isinstance(v, (list, tuple)):
        return all(_json_safe(x) for x in v)
    if isinstance(v, dict):
        return all(isinstance(k, str) and _json_safe(val) for k, val in v.items())
    return False


def _register(app, *_args, **_kwargs):
    from fastapi import Body, HTTPException
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

    @app.get("/forge-neo/options-schema")
    def get_options_schema():
        """Expose shared.opts.data_labels so the native Backend Settings page can
        render typed inputs grouped by section. component_args often contains
        gradio-specific keys (choices, minimum, maximum, step) which we pass
        through verbatim so the renderer can pick what it needs.
        """
        out = []
        try:
            labels = shared.opts.data_labels
        except Exception:
            labels = {}
        for key, info in labels.items():
            try:
                component = getattr(info, "component", None)
                component_name = (
                    component.__name__
                    if isinstance(component, type)
                    else (component.__class__.__name__ if component is not None else None)
                )
                args = getattr(info, "component_args", None)
                if callable(args):
                    try:
                        args = args()
                    except Exception:
                        args = None
                if not isinstance(args, dict):
                    args = {} if args is None else {"raw": str(args)}
                out.append({
                    "key": key,
                    "label": getattr(info, "label", key),
                    "default": getattr(info, "default", None),
                    "section": list(getattr(info, "section", (None, None))),
                    "component": component_name,
                    "component_args": {k: v for k, v in args.items() if _json_safe(v)},
                    "category_id": getattr(info, "category_id", None),
                    "refresh": getattr(info, "refresh", None) is not None,
                    "comment": getattr(info, "comment_before", "") + getattr(info, "comment_after", ""),
                })
            except Exception as exc:
                _log_error(exc)
        return JSONResponse(out)

    @app.post("/forge-neo/modelmerger")
    def post_modelmerger(payload: dict = Body(...)):
        """Wrap the same Python the Gradio Model Merger tab uses. Mode is
        'Weighted sum' | 'Add difference' | 'No interpolation'. Returns the
        saved checkpoint filename when finished.
        """
        try:
            from modules import extras as _extras
        except Exception as exc:
            _log_error(exc)
            raise HTTPException(status_code=500, detail=f"modelmerger module unavailable: {exc}")

        try:
            result_info = _extras.run_modelmerger(
                id_task="forge-neo-modelmerger",
                primary_model_name=payload.get("primary_model_name", ""),
                secondary_model_name=payload.get("secondary_model_name", ""),
                tertiary_model_name=payload.get("tertiary_model_name", ""),
                interp_method=payload.get("interp_method", "Weighted sum"),
                multiplier=float(payload.get("multiplier", 0.5)),
                save_as_half=bool(payload.get("save_as_half", False)),
                custom_name=payload.get("custom_name", ""),
                checkpoint_format=payload.get("checkpoint_format", "safetensors"),
                config_source=int(payload.get("config_source", 0)),
                bake_in_vae=payload.get("bake_in_vae", ""),
                discard_weights=payload.get("discard_weights", ""),
                save_metadata=bool(payload.get("save_metadata", True)),
                add_merge_recipe=bool(payload.get("add_merge_recipe", True)),
                copy_metadata_fields=bool(payload.get("copy_metadata_fields", True)),
                metadata_json=payload.get("metadata_json", "{}"),
            )
        except TypeError:
            # Older fork signatures drop the metadata-related kwargs; retry the
            # minimal positional shape.
            try:
                result_info = _extras.run_modelmerger(
                    "forge-neo-modelmerger",
                    payload.get("primary_model_name", ""),
                    payload.get("secondary_model_name", ""),
                    payload.get("tertiary_model_name", ""),
                    payload.get("interp_method", "Weighted sum"),
                    float(payload.get("multiplier", 0.5)),
                    bool(payload.get("save_as_half", False)),
                    payload.get("custom_name", ""),
                    payload.get("checkpoint_format", "safetensors"),
                    int(payload.get("config_source", 0)),
                    payload.get("bake_in_vae", ""),
                    payload.get("discard_weights", ""),
                )
            except Exception as exc:
                _log_error(exc)
                raise HTTPException(status_code=500, detail=str(exc))
        except Exception as exc:
            _log_error(exc)
            raise HTTPException(status_code=500, detail=str(exc))

        if isinstance(result_info, (list, tuple)):
            message = next((x for x in result_info if isinstance(x, str)), "")
        else:
            message = str(result_info)
        return JSONResponse({"info": message})

    @app.post("/forge-neo/extensions/{name}/toggle")
    def post_extension_toggle(name: str, payload: dict = Body(default={})):
        try:
            from modules import extensions as _ext
        except Exception as exc:
            _log_error(exc)
            raise HTTPException(status_code=500, detail=f"extensions module unavailable: {exc}")

        target = None
        for e in _ext.extensions:
            if e.name == name:
                target = e
                break
        if target is None:
            raise HTTPException(status_code=404, detail=f"extension not found: {name}")

        want_enabled = payload.get("enabled")
        new_state = bool(want_enabled) if want_enabled is not None else not target.enabled

        try:
            disabled = list(shared.opts.disabled_extensions or [])
        except Exception:
            disabled = []
        if new_state:
            disabled = [d for d in disabled if d != name]
        elif name not in disabled:
            disabled.append(name)
        try:
            shared.opts.disabled_extensions = disabled
            shared.opts.save(shared.config_filename)
        except Exception as exc:
            _log_error(exc)
            raise HTTPException(status_code=500, detail=f"failed to persist toggle: {exc}")
        target.enabled = new_state
        return JSONResponse({"name": name, "enabled": new_state, "restart_required": True})

    @app.post("/forge-neo/refresh-loras")
    def post_refresh_loras():
        """The LoRAs route rescans on each call, so this is mostly a no-op
        hook for the renderer's Refresh button. Returns the current count so
        the UI can show a flash."""
        count = len(_list_loras())
        return JSONResponse({"count": count})


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
