import { z } from 'zod';

export const LinkType = z.enum(['image', 'audio']);

export const LinkDescription = z.object({
  id: z.string(),
  url: z.string(),
  type: LinkType,
  description: z.string(),
});
export type LinkDescription = z.infer<typeof LinkDescription>;
export const ImageLinkDescription = LinkDescription.extend({
  type: LinkType.refine(value => value === 'image'),
  preview: z.string(),
  context: z.string(),
});
export type ImageLinkDescription = z.infer<typeof ImageLinkDescription>;
export const AudioLinkDescription = LinkDescription.extend({
  type: LinkType.refine(value => value === 'audio'),
});
export type AudioLinkDescription = z.infer<typeof AudioLinkDescription>;

export const LinkContext = z.object({
  id: z.string({ description: 'Identifier taken from alt text, it should be in uuid format' }),
  url: z.string({ description: 'Href of the link' }),
  context: z.string({ description: 'Link context' }),
});
export type LinkContext = z.infer<typeof LinkContext>;

export const LinksContext = z.object({
  links: z.array(LinkContext),
});
export type LinksContext = z.infer<typeof LinksContext>;

export const Question = z.object({
  id: z.string(),
  question: z.string(),
});
export type Question = z.infer<typeof Question>;
export const QuestionWithAnswer = Question.extend({
  answer: z.string(),
});
export type QuestionWithAnswer = z.infer<typeof QuestionWithAnswer>;
