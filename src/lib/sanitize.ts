import sanitizeHtml from "sanitize-html";

export function sanitizeHtml_(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "hr",
      "strong", "em", "u", "s", "code", "pre",
      "blockquote",
      "ul", "ol", "li",
      "h1", "h2", "h3", "h4",
      "a", "img",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel", "title"],
      img: ["src", "alt", "title"],
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        },
      }),
    },
  });
}

// Keep the original export name for callers.
export { sanitizeHtml_ as sanitizeHtml };
