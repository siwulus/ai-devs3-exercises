import { z } from 'zod';

const BaseFileContent = z.object({
  parentPath: z.string(),
  name: z.string(),
});
type BaseFileContent = z.infer<typeof BaseFileContent>;

export const TextFileContent = BaseFileContent.extend({
  text: z.string(),
});
export type TextFileContent = z.infer<typeof TextFileContent>;
export const ImageFileContent = BaseFileContent.extend({
  base64Url: z.string(),
});
export type ImageFileContent = z.infer<typeof ImageFileContent>;
export const AudioFileContent = BaseFileContent.extend({
  buffer: z.custom<Buffer>(Buffer.isBuffer, { message: 'Expected a buffer' }),
});
export type AudioFileContent = z.infer<typeof AudioFileContent>;
