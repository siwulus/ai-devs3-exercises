import { z } from 'zod';
import { ReportAkc } from '../../infrustructure/headquoter';

export const Command = z.enum(['START', 'REPAIR', 'DARKEN', 'BRIGHTEN']);
export type Command = z.infer<typeof Command>;
export const ProcessorResponse = ReportAkc;
export type ProcessorResponse = z.infer<typeof ProcessorResponse>;

export const Status = z.enum(['SUCCESS', 'ERROR'], {
  description: 'Indicates the result of the operation.',
});

export type Status = z.infer<typeof Status>;

export const ExtractImageUrlsResponse = z.object({
  status: Status,
  images: z.array(z.string(), {
    description: 'List of extracted image URLs. Empty if none found.',
  }),
});
export type ExtractImageUrlsResponse = z.infer<typeof ExtractImageUrlsResponse>;

export const ExtractImageUrlResponse = z.object({
  status: Status,
  image: z.string({ description: 'Image URL' }).optional(),
});
export type ExtractImageUrlResponse = z.infer<typeof ExtractImageUrlResponse>;
