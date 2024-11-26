import { z } from 'zod';

export const Neo4JConnectionConfig = z.object({
  url: z.string(),
  username: z.string(),
  password: z.string(),
});

export type Neo4JConnectionConfig = z.infer<typeof Neo4JConnectionConfig>;
