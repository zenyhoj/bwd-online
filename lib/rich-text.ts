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
  if (!value) return "";
  
  const trimmed = value.trim();
  if (!trimmed) return "";

  // If it's plain text (no HTML tags), wrap in a single paragraph first
  let html = trimmed;
  if (!HTML_TAG_PATTERN.test(trimmed)) {
    html = trimmed
      .split(/\n+/)
      .map(line => `<p>${line.trim()}</p>`)
      .join("");
  } else {
    html = html.replace(EMPTY_PARAGRAPH_PATTERN, "");
  }

  // Repair mashed text only within paragraph content to avoid breaking tags
  const repaired = html.replace(PARAGRAPH_PATTERN, (match, content) => {
    return `<p>${repairMashedText(content)}</p>`;
  });

  // Always try to convert rows to tables if they exist
  return convertParagraphRowsToTable(repaired);
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value.replace(HTML_TAG_PATTERN, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function repairMashedText(text: string) {
  let repaired = text
    // Add space between lowercase and uppercase: "ManaliliBrgy" -> "Manalili Brgy"
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Add space between number and uppercase: "9074865848Vic" -> "9074865848 Vic"
    .replace(/([0-9])([A-Z])/g, '$1 $2')
    // Add space between lowercase and number: "Manalili10" -> "Manalili 10"
    .replace(/([a-z])([0-9])/g, '$1 $2')
    // Ensure space around "Brgy.": "ManaliliBrgy.10" -> "Manalili Brgy. 10"
    .replace(/([^ ])(Brgy\.)/gi, '$1 $2')
    .replace(/(Brgy\.)([^ \d])/gi, '$1 $2') // Space after Brgy. if not a number
    .replace(/(Brgy\.\s*\d+)([^ \d])/gi, '$1 $2'); // Space after Brgy. Number

  // New: If the text looks like a single-line list of plumbers, force line breaks
  // Pattern: Look for [Phone Number] followed by [Capital Letter (Next Name)]
  repaired = repaired.replace(/(\d{10,11})\s+([A-Z])/g, '$1\n$2');
  // Pattern: Look for "Contact" followed by the first name
  repaired = repaired.replace(/(Contact)\s+([A-Z])/gi, '$1\n$2');

  return repaired;
}

function convertParagraphRowsToTable(value: string) {
  // First, apply repair logic to the whole block if it's currently in <p> tags
  const repairedValue = value.replace(PARAGRAPH_PATTERN, (match, content) => {
    const repaired = repairMashedText(content);
    // If we introduced newlines, split them into separate paragraphs
    if (repaired.includes('\n')) {
      return repaired.split('\n').map(line => `<p>${line.trim()}</p>`).join("");
    }
    return `<p>${repaired}</p>`;
  });

  // Now, find all logical paragraphs (including those we just split)
  const flattened = repairedValue.replace(PARAGRAPH_PATTERN, (match, content) => {
    return content.split(/<br\s*\/?>/gi).map((line: string) => `<p>${line.trim()}</p>`).join("");
  });

  const flatParagraphs = Array.from(flattened.matchAll(PARAGRAPH_PATTERN));
  if (flatParagraphs.length < 2) return flattened;

  let output = flattened;
  let offset = 0;
  let runStart = -1;
  let runRows: RichTextTableRow[] = [];

  const flushRun = (endIndex: number) => {
    if (runStart === -1 || runRows.length < 2) {
      runStart = -1;
      runRows = [];
      return;
    }

    const startMatch = flatParagraphs[runStart];
    const endMatch = flatParagraphs[endIndex - 1];
    const start = (startMatch.index ?? 0) + offset;
    const end = (endMatch.index ?? 0) + offset + endMatch[0].length;
    const replacement = renderTable(runRows);

    output = `${output.slice(0, start)}${replacement}${output.slice(end)}`;
    offset += replacement.length - (end - start);
    runStart = -1;
    runRows = [];
  };

  flatParagraphs.forEach((match, index) => {
    const row = parseTableRow(match[1]);
    if (row) {
      if (runStart === -1) runStart = index;
      runRows.push(row);
      return;
    }
    flushRun(index);
  });

  flushRun(flatParagraphs.length);

  return output;
}

function splitRowColumns(value: string) {
  const decoded = decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&nbsp;/gi, " ");
  
  // First try standard splitting
  let columns = decoded.split(/\s{2,}|\t+|\|/).map(part => stripHtml(part)).filter(Boolean);
  
  // If we only found one column, the text might be mashed
  if (columns.length === 1) {
    const repaired = repairMashedText(decoded);
    columns = repaired.split(/\s{2,}|\t+|\||\s{1,}/).map(part => stripHtml(part)).filter(Boolean);
  }

  return columns;
}

function parseTableRow(value: string): RichTextTableRow | null {
  const columns = splitRowColumns(value);
  if (columns.length < 3) {
    return null;
  }

  let contact = "";
  let areaEndIndex = columns.length;

  // Greedily collect columns from the end that look like phone numbers, slashes, or leading digits
  for (let i = columns.length - 1; i >= 1; i--) {
    const col = columns[i];
    const isPhoneLike = /^[\d\s/-]+$/.test(col) || col === "0" || col.includes("/");
    
    if (isPhoneLike) {
      contact = (col + " " + contact).trim();
      areaEndIndex = i;
    } else {
      break;
    }
  }

  // Cleanup contact: remove extra spaces around slashes and heal split zeros
  contact = contact
    .replace(/\s*\/\s*/g, "/") // "0 / 9" -> "0/9"
    .replace(/(\D|^)0\s+(\d{10})/g, "$10$2") // " 0 907..." -> " 0907..."
    .replace(/\/0\s+(\d{10})/g, "/0$1"); // "/0 907..." -> "/0907..."

  // Basic validation that we found at least one real number
  if (!/\d{7,}/.test(contact)) {
    return null;
  }

  // Find where the "Area" (address) likely starts. 
  const addressKeywords = ["Brgy", "Barangay", "Sacol", "Rizal", "Manapa", "Guinabsan", "Poblacion"];
  let areaStartIndex = -1;
  
  for (let i = 0; i < areaEndIndex; i++) {
    const col = columns[i].toLowerCase();
    if (addressKeywords.some(keyword => col.includes(keyword.toLowerCase()))) {
      areaStartIndex = i;
      break;
    }
  }

  // Fallback: If no keyword found, assume the column before the contact is Area
  if (areaStartIndex === -1) {
    areaStartIndex = Math.max(0, areaEndIndex - 1);
  }

  const name = columns.slice(0, areaStartIndex).join(" ").replace(/^[^\p{L}\p{N}]+/u, "").trim();
  const area = columns.slice(areaStartIndex, areaEndIndex).join(" ").trim();

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
