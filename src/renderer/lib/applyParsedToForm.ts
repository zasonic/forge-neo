import type { Txt2ImgPayload } from '@shared/api/schemas.js';

type SetField = <K extends keyof Txt2ImgPayload>(
  key: K,
  value: Txt2ImgPayload[K],
) => void;

export function applyParsedFields(
  fields: Partial<Txt2ImgPayload>,
  setField: SetField,
): void {
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) setField(k as keyof Txt2ImgPayload, v as never);
  }
}
