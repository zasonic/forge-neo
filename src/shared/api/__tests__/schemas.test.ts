import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  Embedding,
  Extension,
  ExtrasSinglePayload,
  ExtrasSingleResponse,
  GenerationResponse,
  Lora,
  ModelMergerPayload,
  ModelMergerResponse,
  OptionMetadata,
  OptionsResponse,
  ProgressResponse,
  Sampler,
  Scheduler,
  SdModel,
  Txt2ImgPayload,
  Upscaler,
} from '../schemas.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(join(here, 'fixtures', name), 'utf-8'));

describe('Forge API schemas — fixture parses', () => {
  it('parses /sdapi/v1/sd-models', () => {
    const parsed = z.array(SdModel).parse(fixture('sd-models.json'));
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.model_name).toBe('v1-5-pruned-emaonly');
  });

  it('parses /sdapi/v1/samplers and preserves option values', () => {
    const parsed = z.array(Sampler).parse(fixture('samplers.json'));
    const euler = parsed.find((s) => s.name === 'Euler a');
    expect(euler).toBeDefined();
    expect(euler?.aliases).toContain('k_euler_a');
    const dpmpp = parsed.find((s) => s.name === 'DPM++ 2M');
    expect(dpmpp?.options.scheduler).toBe('Karras');
  });

  it('parses /sdapi/v1/schedulers', () => {
    const parsed = z.array(Scheduler).parse(fixture('schedulers.json'));
    expect(parsed.map((s) => s.name)).toContain('karras');
  });

  it('parses /sdapi/v1/upscalers including null model fields', () => {
    const parsed = z.array(Upscaler).parse(fixture('upscalers.json'));
    expect(parsed[0]?.name).toBe('None');
    expect(parsed[0]?.model_name).toBeNull();
    const esrgan = parsed.find((u) => u.name === 'R-ESRGAN 4x+');
    expect(esrgan?.model_path).toContain('RealESRGAN_x4plus');
  });

  it('parses /sdapi/v1/options (passthrough)', () => {
    const parsed = OptionsResponse.parse(fixture('options.json'));
    expect(parsed.sd_model_checkpoint).toContain('v1-5-pruned-emaonly');
    expect(parsed.sd_vae).toBe('Automatic');
  });

  it('parses /sdapi/v1/progress with nested state', () => {
    const parsed = ProgressResponse.parse(fixture('progress.json'));
    expect(parsed.progress).toBeCloseTo(0.45);
    expect(parsed.state.sampling_step).toBe(9);
    expect(parsed.state.sampling_steps).toBe(20);
    expect(parsed.state.interrupted).toBe(false);
  });

  it('parses POST /sdapi/v1/txt2img response', () => {
    const parsed = GenerationResponse.parse(fixture('txt2img-response.json'));
    expect(parsed.images).toHaveLength(1);
    expect(typeof parsed.images[0]).toBe('string');
    expect(parsed.info).toContain('"seed": 1234567890');
  });

  it('parses /sdapi/v1/loras', () => {
    const parsed = z.array(Lora).parse(fixture('loras.json'));
    expect(parsed).toHaveLength(2);
    expect(parsed[1]?.metadata).toEqual({
      trained_words: ['detail'],
      sd_version: 'SDXL',
    });
  });
});

describe('Txt2ImgPayload defaults flow through', () => {
  it('fills every documented default for a minimal payload', () => {
    const parsed = Txt2ImgPayload.parse({ prompt: 'hello' });
    expect(parsed).toMatchObject({
      prompt: 'hello',
      negative_prompt: '',
      steps: 20,
      cfg_scale: 7,
      width: 512,
      height: 512,
      seed: -1,
      batch_size: 1,
      n_iter: 1,
      enable_hr: false,
      hr_scale: 2,
      save_images: true,
    });
  });

  it('enforces width/height multiple of 8', () => {
    expect(() => Txt2ImgPayload.parse({ prompt: 'x', width: 513 })).toThrow();
    expect(() => Txt2ImgPayload.parse({ prompt: 'x', height: 100 })).toThrow();
  });

  it('clamps steps to documented range', () => {
    expect(() => Txt2ImgPayload.parse({ prompt: 'x', steps: 0 })).toThrow();
    expect(() => Txt2ImgPayload.parse({ prompt: 'x', steps: 151 })).toThrow();
    expect(Txt2ImgPayload.parse({ prompt: 'x', steps: 150 }).steps).toBe(150);
  });
});

describe('Embedding schema tolerates upstream variability', () => {
  it('accepts all-null detail fields', () => {
    const parsed = Embedding.parse({ name: 'foo' });
    expect(parsed.name).toBe('foo');
    expect(parsed.step).toBeUndefined();
  });

  it('accepts populated fields', () => {
    const parsed = Embedding.parse({
      name: 'foo',
      step: 1000,
      sd_checkpoint: 'sha',
      shape: 768,
      vectors: 4,
    });
    expect(parsed.vectors).toBe(4);
  });
});

describe('Extension list schema', () => {
  it('parses the /sdapi/v1/extensions fixture', () => {
    const parsed = z.array(Extension).parse(fixture('extensions.json'));
    expect(parsed).toHaveLength(3);
    expect(parsed[0]?.name).toBe('forge-neo-api');
    expect(parsed[0]?.enabled).toBe(true);
    expect(parsed[1]?.remote).toContain('controlnet');
    expect(parsed[2]?.enabled).toBe(false);
  });
});

describe('OptionMetadata schema for /forge-neo/options-schema', () => {
  it('parses the bundled fixture', () => {
    const parsed = z.array(OptionMetadata).parse(fixture('options-schema.json'));
    expect(parsed).toHaveLength(4);
    const clipSkip = parsed.find((o) => o.key === 'CLIP_stop_at_last_layers');
    expect(clipSkip?.component).toBe('Slider');
    expect(clipSkip?.component_args.maximum).toBe(12);
  });
});

describe('Extras and Model Merger payload/response schemas', () => {
  it('fills extras defaults for a minimal payload', () => {
    const parsed = ExtrasSinglePayload.parse({ image: 'xxxx' });
    expect(parsed.upscaler_1).toBe('None');
    expect(parsed.upscaling_resize).toBe(2);
    expect(parsed.upscale_first).toBe(false);
  });

  it('parses the extras single response fixture', () => {
    const parsed = ExtrasSingleResponse.parse(fixture('extras-single-response.json'));
    expect(parsed.image).toContain('iVBORw0KGgo');
    expect(parsed.html_info).toContain('Postprocess');
  });

  it('rejects out-of-range multipliers', () => {
    expect(() =>
      ModelMergerPayload.parse({
        primary_model_name: 'a',
        secondary_model_name: 'b',
        multiplier: 1.5,
      }),
    ).toThrow();
  });

  it('parses the modelmerger response fixture', () => {
    const parsed = ModelMergerResponse.parse(fixture('modelmerger-response.json'));
    expect(parsed.info).toContain('merged-AB.safetensors');
  });
});
