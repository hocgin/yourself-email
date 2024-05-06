import {stripHtml as _stripHtml} from "string-strip-html";
import sanitizeHtml from 'sanitize-html';
import type {IOptions} from 'sanitize-html';


export function stripHtml(html: string) {
  if (!html?.length) return html;
  return _stripHtml(html)?.result;
}


export const sanitize = (dirty: string, options?: IOptions) => {
  if (!dirty?.trim?.()?.length) return undefined;
  const defaultOptions = {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
    allowedAttributes: {
      '*': ["style"],
      td: ['*'],
      p: ['dir', '*'],
      a: ['href', 'name', 'target', 'style'],
      // We don't currently allow img itself by default, but
      // these attributes would make sense if we did.
      img: ['style', 'src', 'srcset', 'alt', 'title', 'width', 'height', 'loading']
    },
  } as any;
  return ({
    __html: sanitizeHtml(dirty, {...defaultOptions, ...options}),
  });
}
