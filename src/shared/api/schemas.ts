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

export const ExtrasSinglePayload = z.object({
  image: z.string(),
  resize_mode: z.number().int().default(0),
  show_extras_results: z.boolean().default(true),
  gfpgan_visibility: z.number().min(0).max(1).default(0),
  codeformer_visibility: z.number().min(0).max(1).default(0),
  codeformer_weight: z.number().min(0).max(1).default(0),
  upscaling_resize: z.number().default(2),
  upscaling_resize_w: z.number().int().default(512),
  upscaling_resize_h: z.number().int().default(512),
  upscaling_crop: z.boolean().default(true),
  upscaler_1: z.string().default('None'),
  upscaler_2: z.string().default('None'),
  extras_upscaler_2_visibility: z.number().min(0).max(1).default(0),
  upscale_first: z.boolean().default(false),
});
export type ExtrasSinglePayload = z.infer<typeof ExtrasSinglePayload>;

export const ExtrasSingleResponse = z.object({
  html_info: z.string(),
  image: z.string(),
});
export type ExtrasSingleResponse = z.infer<typeof ExtrasSingleResponse>;

export const PngInfoApiResponse = z.object({
  info: z.string().default(''),
  items: z.record(z.unknown()).default({}),
  parameters: z.record(z.unknown()).default({}),
});
export type PngInfoApiResponse = z.infer<typeof PngInfoApiResponse>;

export const ModelMergerPayload = z.object({
  primary_model_name: z.string(),
  secondary_model_name: z.string(),
  tertiary_model_name: z.string().default(''),
  interp_method: z
    .enum(['Weighted sum', 'Add difference', 'No interpolation'])
    .default('Weighted sum'),
  multiplier: z.number().min(0).max(1).default(0.5),
  save_as_half: z.boolean().default(false),
  custom_name: z.string().default(''),
  checkpoint_format: z.enum(['safetensors', 'ckpt']).default('safetensors'),
  config_source: z.number().int().default(0),
  bake_in_vae: z.string().default(''),
  discard_weights: z.string().default(''),
  save_metadata: z.boolean().default(true),
});
export type ModelMergerPayload = z.infer<typeof ModelMergerPayload>;

export const ModelMergerResponse = z.object({
  info: z.string(),
});
export type ModelMergerResponse = z.infer<typeof ModelMergerResponse>;

export const Extension = z.object({
  name: z.string(),
  remote: z.string().nullable().optional(),
  branch: z.string().nullable().optional(),
  commit_hash: z.string().nullable().optional(),
  commit_date: z.number().nullable().optional(),
  version: z.string().nullable().optional(),
  enabled: z.boolean(),
});
export type Extension = z.infer<typeof Extension>;

export const ExtensionToggleResponse = z.object({
  name: z.string(),
  enabled: z.boolean(),
  restart_required: z.boolean().default(true),
});
export type ExtensionToggleResponse = z.infer<typeof ExtensionToggleResponse>;

export const OptionMetadata = z.object({
  key: z.string(),
  label: z.string(),
  default: z.unknown().nullable().optional(),
  section: z.array(z.string().nullable()).default([]),
  component: z.string().nullable().optional(),
  component_args: z.record(z.unknown()).default({}),
  category_id: z.string().nullable().optional(),
  refresh: z.boolean().default(false),
  comment: z.string().default(''),
});
export type OptionMetadata = z.infer<typeof OptionMetadata>;

export const CmdFlags = z.record(z.unknown());
export type CmdFlags = z.infer<typeof CmdFlags>;
