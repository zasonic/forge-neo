import { z } from 'zod';

export const SdModel = z.object({
  title: z.string(),
  model_name: z.string(),
  hash: z.string().nullable().optional(),
  sha256: z.string().nullable().optional(),
  filename: z.string().optional(),
  config: z.string().nullable().optional(),
});
export type SdModel = z.infer<typeof SdModel>;

export const Sampler = z.object({
  name: z.string(),
  aliases: z.array(z.string()).default([]),
  options: z.record(z.string()).default({}),
});
export type Sampler = z.infer<typeof Sampler>;

export const Scheduler = z.object({
  name: z.string(),
  label: z.string().optional(),
});
export type Scheduler = z.infer<typeof Scheduler>;

export const Upscaler = z.object({
  name: z.string(),
  model_name: z.string().nullable().optional(),
  model_path: z.string().nullable().optional(),
  scale: z.number().optional(),
});
export type Upscaler = z.infer<typeof Upscaler>;

export const OptionsResponse = z.object({
  sd_model_checkpoint: z.string().optional(),
  sd_vae: z.string().optional(),
}).passthrough();
export type OptionsResponse = z.infer<typeof OptionsResponse>;

export const Txt2ImgPayload = z.object({
  prompt: z.string(),
  negative_prompt: z.string().default(''),
  sampler_name: z.string().optional(),
  scheduler: z.string().optional(),
  steps: z.number().int().min(1).max(150).default(20),
  cfg_scale: z.number().min(0).max(30).default(7),
  width: z.number().int().multipleOf(8).default(512),
  height: z.number().int().multipleOf(8).default(512),
  seed: z.number().int().default(-1),
  batch_size: z.number().int().min(1).max(8).default(1),
  n_iter: z.number().int().min(1).max(100).default(1),
  enable_hr: z.boolean().default(false),
  hr_scale: z.number().default(2),
  hr_upscaler: z.string().optional(),
  denoising_strength: z.number().optional(),
  save_images: z.boolean().default(true),
  override_settings: z.record(z.unknown()).optional(),
});
export type Txt2ImgPayload = z.infer<typeof Txt2ImgPayload>;

export const Img2ImgPayload = Txt2ImgPayload.omit({ enable_hr: true, hr_scale: true, hr_upscaler: true }).extend({
  init_images: z.array(z.string()),
  denoising_strength: z.number().min(0).max(1).default(0.75),
  mask: z.string().nullable().optional(),
});
export type Img2ImgPayload = z.infer<typeof Img2ImgPayload>;

export const GenerationResponse = z.object({
  images: z.array(z.string()),
  parameters: z.record(z.unknown()).optional(),
  info: z.string(),
});
export type GenerationResponse = z.infer<typeof GenerationResponse>;

export const ProgressResponse = z.object({
  progress: z.number(),
  eta_relative: z.number().optional(),
  state: z.object({
    skipped: z.boolean(),
    interrupted: z.boolean(),
    job: z.string().optional(),
    job_count: z.number().optional(),
    job_no: z.number().optional(),
    sampling_step: z.number().optional(),
    sampling_steps: z.number().optional(),
  }).passthrough(),
  current_image: z.string().nullable().optional(),
  textinfo: z.string().nullable().optional(),
});
export type ProgressResponse = z.infer<typeof ProgressResponse>;

export const Lora = z.object({
  name: z.string(),
  alias: z.string().optional(),
  path: z.string().optional(),
  preview: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});
export type Lora = z.infer<typeof Lora>;

export const Embedding = z.object({
  name: z.string(),
  step: z.number().nullable().optional(),
  sd_checkpoint: z.string().nullable().optional(),
  shape: z.number().nullable().optional(),
  vectors: z.number().nullable().optional(),
});
export type Embedding = z.infer<typeof Embedding>;
