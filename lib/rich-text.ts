const HTML_TAG_PATTERN = /<[^>]+>/g;
const MULTI_SPACE_PATTERN = /\s+/g;
const EMPTY_PARAGRAPH_PATTERN = /<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi;
const PARAGRAPH_PATTERN = /<p>([\s\S]*?)<\/p>/gi;

type RichTextTableRow = {
  name: string;
  area: string;
  contact: string;
};

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

  return getRichTextPlainText(normalized).length > 0 ? convertParagraphRowsToTable(normalized) : "";
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value.replace(HTML_TAG_PATTERN, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function splitRowColumns(value: string) {
  return decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .split(/\s{2,}/)
    .map((part) => stripHtml(part))
    .filter(Boolean);
}

function parseTableRow(value: string): RichTextTableRow | null {
  const columns = splitRowColumns(value);
  if (columns.length < 3) {
    return null;
  }

  const contact = columns[columns.length - 1];
  if (!/^\d[\d\s/-]{6,}$/.test(contact)) {
    return null;
  }

  const area = columns[columns.length - 2];
  const name = columns.slice(0, -2).join(" ").replace(/^[^\p{L}\p{N}]+/u, "").trim();

  if (!name || !area) {
    return null;
  }

  return {
    name,
    area,
    contact
  };
}

function renderTable(rows: RichTextTableRow[]) {
  const body = rows
    .map(
      (row) =>
        `<tr><td>${row.name}</td><td>${row.area}</td><td>${row.contact}</td></tr>`
    )
    .join("");

  return `<div class="rich-text-table-wrap"><table class="rich-text-table"><thead><tr><th>Name</th><th>Area</th><th>Contact</th></tr></thead><tbody>${body}</tbody></table></div>`;
}

function convertParagraphRowsToTable(value: string) {
  const paragraphs = Array.from(value.matchAll(PARAGRAPH_PATTERN));
  if (paragraphs.length < 2) {
    return value;
  }

  let output = value;
  let offset = 0;
  let runStart = -1;
  let runRows: RichTextTableRow[] = [];

  const flushRun = (endIndex: number) => {
    if (runStart === -1 || runRows.length < 2) {
      runStart = -1;
      runRows = [];
      return;
    }

    const startMatch = paragraphs[runStart];
    const endMatch = paragraphs[endIndex - 1];
    const start = (startMatch.index ?? 0) + offset;
    const end = (endMatch.index ?? 0) + offset + endMatch[0].length;
    const replacement = renderTable(runRows);

    output = `${output.slice(0, start)}${replacement}${output.slice(end)}`;
    offset += replacement.length - (end - start);
    runStart = -1;
    runRows = [];
  };

  paragraphs.forEach((match, index) => {
    const row = parseTableRow(match[1]);
    if (row) {
      if (runStart === -1) {
        runStart = index;
      }
      runRows.push(row);
      return;
    }

    flushRun(index);
  });

  flushRun(paragraphs.length);

  return output;
}
