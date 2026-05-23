import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  Embedding,
  GenerationResponse,
  Img2ImgPayload,
  Lora,
  OptionsResponse,
  PngInfoResult,
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

describe('Img2ImgPayload defaults flow through', () => {
  it('fills denoising_strength and keeps init_images required', () => {
    const parsed = Img2ImgPayload.parse({ prompt: 'hi', init_images: ['xxxxBase64xxxx'] });
    expect(parsed.denoising_strength).toBe(0.75);
    expect(parsed.init_images).toEqual(['xxxxBase64xxxx']);
    expect(parsed.cfg_scale).toBe(7);
    expect(parsed.width).toBe(512);
  });

  it('does not carry the hires-fix fields from Txt2ImgPayload', () => {
    const parsed = Img2ImgPayload.parse({ prompt: 'hi', init_images: [] });
    expect('enable_hr' in parsed).toBe(false);
    expect('hr_scale' in parsed).toBe(false);
    expect('hr_upscaler' in parsed).toBe(false);
  });

  it('clamps denoising_strength to [0,1]', () => {
    expect(() =>
      Img2ImgPayload.parse({ prompt: 'x', init_images: [], denoising_strength: 1.1 }),
    ).toThrow();
    expect(() =>
      Img2ImgPayload.parse({ prompt: 'x', init_images: [], denoising_strength: -0.1 }),
    ).toThrow();
  });
});

describe('PngInfoResult round-trips', () => {
  it('parses and re-emits the documented shape', () => {
    const value = {
      prompt: 'a cat',
      negativePrompt: 'lowres',
      parameters: { Steps: '20', Sampler: 'Euler a', Seed: '42' },
      raw: 'a cat\nNegative prompt: lowres\nSteps: 20, Sampler: Euler a, Seed: 42',
    };
    expect(PngInfoResult.parse(value)).toEqual(value);
  });

  it('rejects non-string parameter values', () => {
    expect(() =>
      PngInfoResult.parse({
        prompt: '',
        negativePrompt: '',
        parameters: { Steps: 20 },
        raw: '',
      }),
    ).toThrow();
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
