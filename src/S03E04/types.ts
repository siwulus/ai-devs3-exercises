import { z } from 'zod';

export const InitialNames = z.object({
  people: z.array(z.string()),
  places: z.array(z.string()),
});
export type InitialNames = z.infer<typeof InitialNames>;

export const Action = z.enum(['people', 'places', 'response']);
export type Action = z.infer<typeof Action>;

export const LocationSearch = z.object({
  action: Action,
  message: z.string(),
});
export type LocationSearch = z.infer<typeof LocationSearch>;
