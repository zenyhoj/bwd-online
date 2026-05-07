const HTML_TAG_PATTERN = /<[^>]+>/g;
const MULTI_SPACE_PATTERN = /\s+/g;
const EMPTY_PARAGRAPH_PATTERN = /<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi;

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export function getRichTextPlainText(value: string) {
  return decodeHtmlEntities(value.replace(HTML_TAG_PATTERN, " "))
    .replace(MULTI_SPACE_PATTERN, " ")
    .trim();
}

export function normalizeRichText(value: string) {
  const normalized = value
    .trim()
    .replace(EMPTY_PARAGRAPH_PATTERN, "");

  return getRichTextPlainText(normalized).length > 0 ? normalized : "";
}
