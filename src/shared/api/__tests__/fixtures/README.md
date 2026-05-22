# Forge API fixtures

These JSON files mirror what `sd-webui-forge-classic` (neo branch) returns
from its `/sdapi/v1/*` endpoints on a live install. They are committed so
the `src/shared/api/schemas.ts` zod schemas can be exercised without a
running backend.

## Capture procedure

With a Forge backend running locally at `http://127.0.0.1:7860`:

```sh
curl -s http://127.0.0.1:7860/sdapi/v1/sd-models   | jq . > sd-models.json
curl -s http://127.0.0.1:7860/sdapi/v1/samplers    | jq . > samplers.json
curl -s http://127.0.0.1:7860/sdapi/v1/schedulers  | jq . > schedulers.json
curl -s http://127.0.0.1:7860/sdapi/v1/upscalers   | jq . > upscalers.json
curl -s http://127.0.0.1:7860/sdapi/v1/options     | jq . > options.json
curl -s "http://127.0.0.1:7860/sdapi/v1/progress?skip_current_image=true" | jq . > progress.json
curl -s http://127.0.0.1:7860/sdapi/v1/loras       | jq . > loras.json

curl -s -X POST http://127.0.0.1:7860/sdapi/v1/txt2img \
  -H 'content-type: application/json' \
  -d '{"prompt":"a photo of a cat","steps":1,"width":64,"height":64}' \
  | jq '.images |= map("…")' > txt2img-response.json
```

Strip the base64 image payloads (replace with a 1×1 PNG) before
committing so fixtures stay tiny — the schema only cares that
`images` is an array of strings.
