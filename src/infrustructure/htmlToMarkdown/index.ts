import TurndownService from 'turndown';
import { v4 } from 'uuid';
import { z } from 'zod';

export const OnLinkData = z.object({
  id: z.string(),
  url: z.string(),
  type: z.enum(['image', 'audio']),
});
export type OnLinkData = z.infer<typeof OnLinkData>;
export const Options = z.object({
  baseUrl: z.string().optional(),
});
export type Options = z.infer<typeof Options>;
const InternalOptions = Options.extend({
  onLink: z.function().args(z.array(OnLinkData)).args(OnLinkData).optional(),
});
type InternalOptions = z.infer<typeof InternalOptions>;
export const ConversionResult = z.object({
  markdown: z.string(),
  links: z.array(OnLinkData),
});
export type ConversionResult = z.infer<typeof ConversionResult>;

const fixUrl = (baseUrl?: string) => (url: string) =>
  url.startsWith('http') && baseUrl ? url : `${baseUrl}${url}`;

const buildService = (options: InternalOptions): TurndownService => {
  const service = new TurndownService({ headingStyle: 'atx' });
  if (options.baseUrl) {
    service.addRule('fixImage', fixImage(options));
    service.addRule('fixAudio', fixAudio(options));
  }
  return service;
};

const fixImage = ({ baseUrl, onLink }: InternalOptions): TurndownService.Rule => ({
  filter: 'img',
  replacement: (content, node) => {
    const id = v4();
    const src = node.getAttribute('src') || '';
    const fullUrl = fixUrl(baseUrl)(src);
    if (onLink) {
      onLink({ id, url: fullUrl, type: 'image' });
    }
    return `![${id}](${fullUrl})`;
  },
});

const fixAudio = ({ baseUrl, onLink }: InternalOptions): TurndownService.Rule => ({
  filter: 'audio',
  replacement: (content, node) => {
    const id = v4();
    const src = node.getAttribute('src');
    if (src) {
      const fullUrl = fixUrl(baseUrl)(src);
      if (onLink) {
        onLink({ id, url: fullUrl, type: 'image' });
      }
      return `[${id}](${fixUrl(baseUrl)(src)})`; // Link to the audio file
    }
    const sources = Array.from(node.querySelectorAll('source'));
    const links = sources
      .map((source: any) => source.getAttribute('src'))
      .filter(Boolean)
      .map(src => fixUrl(baseUrl)(src))
      .map(fullUrl => {
        if (onLink) {
          onLink({ id, url: fullUrl, type: 'audio' });
        }
        return `[${id}](${fullUrl})`;
      })
      .join('\n');

    return links || '[Audio Not Available]';
  },
});

const onLink = (acc: OnLinkData[]) => (data: OnLinkData) => {
  acc.push(data);
  console.log('Link:', data);
  return acc;
};

export const convertHtmlToMarkdown =
  (options: Options = {}) =>
  (html: string | TurndownService.Node): ConversionResult => {
    const links: OnLinkData[] = [];
    const service = buildService({ ...options, onLink: onLink(links) });
    const markdown = service.turndown(html);
    return { markdown, links };
  };
