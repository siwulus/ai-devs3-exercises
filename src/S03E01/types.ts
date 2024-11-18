import { z } from 'zod';
import { TextFileContent } from '../infrustructure/filesystem';

export const FactUsabilityClassification = z.object({
  _explanation: z.string().optional(),
  category: z.enum(['Meaningful', 'Useless']),
});
export type FactUsabilityClassification = z.infer<typeof FactUsabilityClassification>;

export const ReportWithContext = TextFileContent.extend({
  context: z.string(),
});
export type ReportWithContext = z.infer<typeof ReportWithContext>;

export const ReportWithKeywords = ReportWithContext.extend({
  keywords: z.string(),
});
export type ReportWithKeywords = z.infer<typeof ReportWithKeywords>;
