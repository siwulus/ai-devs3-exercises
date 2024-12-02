import TurndownService from 'turndown';
import { v4 } from 'uuid';
import { z } from 'zod';
import { LinkData } from './types.ts';

export const Options = z.object({
  baseUrl: z.string().optional(),
});
export type Options = z.infer<typeof Options>;
const InternalOptions = Options.extend({
  onLink: z.function().args(z.array(LinkData)).args(LinkData).optional(),
});
type InternalOptions = z.infer<typeof InternalOptions>;
export const ConversionResult = z.object({
  markdown: z.string(),
  links: z.array(LinkData),
});
export type ConversionResult = z.infer<typeof ConversionResult>;

const fixUrl = (baseUrl?: string) => (url: string) =>
  url.startsWith('http') && baseUrl ? url : `${baseUrl}${url}`;

const buildService = (options: InternalOptions): TurndownService => {
  const service = new TurndownService({ headingStyle: 'atx' });
  if (options.baseUrl) {
    service.addRule('fixLink', fixLink(options));
    service.addRule('fixImage', fixImage(options));
    service.addRule('fixAudio', fixAudio(options));
  }
  return service;
};

const fixLink = ({ baseUrl, onLink }: InternalOptions): TurndownService.Rule => ({
  filter: 'a',
  replacement: (content, node) => {
    const id = v4();
    const src = node.getAttribute('href') || '';
    const title = node.getAttribute('title') || content.trim() || 'Link';
    const fullUrl = fixUrl(baseUrl)(src);
    if (onLink) {
      onLink({ id, url: fullUrl, type: 'link', description: title });
    }
    return `![${title}](${fullUrl})`;
  },
});

const fixImage = ({ baseUrl, onLink }: InternalOptions): TurndownService.Rule => ({
  filter: 'img',
  replacement: (content, node) => {
    const id = v4();
    const src = node.getAttribute('src') || '';
    const alt = node.getAttribute('alt') || '';
    const fullUrl = fixUrl(baseUrl)(src);
    if (onLink) {
      onLink({ id, url: fullUrl, type: 'image', description: alt });
    }
    return `![${alt}](${fullUrl})`;
  },
});

const fixAudio = ({ baseUrl, onLink }: InternalOptions): TurndownService.Rule => ({
  filter: 'audio',
  replacement: (content, node) => {
    const id = v4();
    const src = node.getAttribute('src');
    const alt = node.getAttribute('alt');
    if (src) {
      const fullUrl = fixUrl(baseUrl)(src);
      if (onLink) {
        onLink({ id, url: fullUrl, type: 'audio', description: alt });
      }
      return `[${alt}](${fixUrl(baseUrl)(src)})`; // Link to the audio file
    }
    const sources = Array.from(node.querySelectorAll('source'));
    const links = sources
      .map((source: any) => source.getAttribute('src'))
      .filter(Boolean)
      .map(src => fixUrl(baseUrl)(src))
      .map(fullUrl => {
        if (onLink) {
          onLink({ id, url: fullUrl, type: 'audio', description: alt });
        }
        return `[${alt}](${fullUrl})`;
      })
      .join('\n');

    return links || '[Audio Not Available]';
  },
});

const onLink = (acc: LinkData[]) => (data: LinkData) => {
  acc.push(data);
  return acc;
};

export const convertHtmlToMarkdown =
  (options: Options = {}) =>
  (html: string | TurndownService.Node): ConversionResult => {
    const links: LinkData[] = [];
    const service = buildService({ ...options, onLink: onLink(links) });
    const markdown = service.turndown(html);
    return { markdown, links };
  };
