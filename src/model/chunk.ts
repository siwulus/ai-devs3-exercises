import { z } from 'zod';

export const Chunk = z.object({
  id: z.string(),
  documentId: z.string(),
  content: z.string(),
  metadata: z.record(z.any()),
});
export type Chunk = z.infer<typeof Chunk>;

export const ChunkEmbedded = Chunk.extend({
  embedding: z.array(z.number()),
});
export type ChunkEmbedded = z.infer<typeof ChunkEmbedded>;
