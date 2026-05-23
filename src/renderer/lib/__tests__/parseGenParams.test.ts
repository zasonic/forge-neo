import { describe, expect, it } from 'vitest';
import { parseGenParams } from '../parseGenParams.js';

describe('parseGenParams', () => {
  it('parses a canonical Forge / A1111 parameters string', () => {
    const text = [
      'a photo of an astronaut riding a horse',
      'Negative prompt: blurry, low quality',
      'Steps: 28, Sampler: Euler a, Schedule type: Karras, CFG scale: 7, Seed: 1234567890, Size: 768x512, Model hash: abc123, Model: dreamshaper',
    ].join('\n');

    const out = parseGenParams(text);
    expect(out).not.toBeNull();
    expect(out!.fields).toMatchObject({
      prompt: 'a photo of an astronaut riding a horse',
      negative_prompt: 'blurry, low quality',
      steps: 28,
      sampler_name: 'Euler a',
      scheduler: 'Karras',
      cfg_scale: 7,
      width: 768,
      height: 512,
      seed: 1234567890,
    });
    expect(out!.unrecognised['Model hash']).toBe('abc123');
    expect(out!.unrecognised.Model).toBe('dreamshaper');
  });

  it('handles missing negative prompt', () => {
    const text = [
      'a quiet mountain lake',
      'Steps: 20, Sampler: DPM++ 2M, CFG scale: 6, Seed: 1, Size: 512x512',
    ].join('\n');
    const out = parseGenParams(text);
    expect(out).not.toBeNull();
    expect(out!.fields.prompt).toBe('a quiet mountain lake');
    expect(out!.fields.negative_prompt).toBeUndefined();
    expect(out!.fields.steps).toBe(20);
    expect(out!.fields.sampler_name).toBe('DPM++ 2M');
  });

  it('handles missing optional keys without crashing', () => {
    const text = [
      'cat',
      'Negative prompt:',
      'Steps: 10, Sampler: Euler, CFG scale: 5, Seed: 0, Size: 512x512',
    ].join('\n');
    const out = parseGenParams(text);
    expect(out).not.toBeNull();
    expect(out!.fields.negative_prompt).toBeUndefined();
    expect(out!.fields.steps).toBe(10);
  });

  it('returns null for unrecognised input', () => {
    expect(parseGenParams('just some random text\nwith two lines')).toBeNull();
    expect(parseGenParams('')).toBeNull();
    expect(parseGenParams(null)).toBeNull();
    expect(parseGenParams(undefined)).toBeNull();
  });

  it('captures hires.fix parameters and toggles enable_hr', () => {
    const text = [
      'mountain',
      'Negative prompt: blur',
      'Steps: 20, Sampler: Euler, CFG scale: 7, Seed: 1, Size: 512x512, Denoising strength: 0.45, Hires upscale: 1.5, Hires upscaler: Latent',
    ].join('\n');
    const out = parseGenParams(text);
    expect(out).not.toBeNull();
    expect(out!.fields.enable_hr).toBe(true);
    expect(out!.fields.hr_scale).toBe(1.5);
    expect(out!.fields.hr_upscaler).toBe('Latent');
    expect(out!.fields.denoising_strength).toBe(0.45);
  });

  it('preserves commas/parentheses inside the prompt body', () => {
    const text = [
      'masterpiece, (best quality:1.2), 1girl, looking at viewer, smiling',
      'Negative prompt: (worst quality:1.4), bad anatomy',
      'Steps: 25, Sampler: Euler a, CFG scale: 7, Seed: 99, Size: 512x768',
    ].join('\n');
    const out = parseGenParams(text);
    expect(out).not.toBeNull();
    expect(out!.fields.prompt).toBe(
      'masterpiece, (best quality:1.2), 1girl, looking at viewer, smiling',
    );
    expect(out!.fields.negative_prompt).toBe('(worst quality:1.4), bad anatomy');
    expect(out!.fields.steps).toBe(25);
    expect(out!.fields.width).toBe(512);
    expect(out!.fields.height).toBe(768);
  });

  it('treats embedded quoted commas in settings as part of one value', () => {
    const text = [
      'a prompt',
      'Negative prompt:',
      'Steps: 20, Sampler: Euler, CFG scale: 7, Seed: 1, Size: 512x512, Lora hashes: "name1: aaa, name2: bbb", Model: foo',
    ].join('\n');
    const out = parseGenParams(text);
    expect(out).not.toBeNull();
    expect(out!.fields.steps).toBe(20);
    expect(out!.unrecognised['Lora hashes']).toBe('name1: aaa, name2: bbb');
    expect(out!.unrecognised.Model).toBe('foo');
  });

  it('parses multi-line prompts before Negative prompt:', () => {
    const text = [
      'line one of prompt',
      'line two of prompt',
      'Negative prompt: nope',
      'Steps: 5, Sampler: Euler, CFG scale: 7, Seed: 2, Size: 64x64',
    ].join('\n');
    const out = parseGenParams(text);
    expect(out).not.toBeNull();
    expect(out!.fields.prompt).toBe('line one of prompt\nline two of prompt');
    expect(out!.fields.negative_prompt).toBe('nope');
  });
});
