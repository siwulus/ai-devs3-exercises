import { z } from 'zod';

export const ActionType = z.enum(['COLLECT_DATA', 'FINAL_RESPONSE']);
export type ActionType = z.infer<typeof ActionType>;

export const Answer = z.object({
  actionType: ActionType,
  query: z
    .string({
      description:
        'SQL query to collect more data required by AI. When action type is COLLECT_DATA the field is mandatory',
    })
    .optional(),
  answer: z
    .string({
      description:
        'The final response to the user. When action type is FINAL_RESPONSE the field is mandatory',
    })
    .optional(),
});

export type Answer = z.infer<typeof Answer>;
