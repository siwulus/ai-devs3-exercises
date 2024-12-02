import { z } from 'zod';

export const LinkData = z.object({
  id: z.string(),
  url: z.string(),
  description: z.string(),
  type: z.enum(['image', 'audio', 'link']),
});
export type LinkData = z.infer<typeof LinkData>;

export const Document = z.object({
  id: z.string(),
  url: z.string(),
  title: z.string(),
  content: z.string(),
  links: z.array(LinkData),
});
export type Document = z.infer<typeof Document>;
