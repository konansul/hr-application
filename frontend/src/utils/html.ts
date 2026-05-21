export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function inlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

function parseMarkdown(text: string): string {
  const lines = text.split('\n');
  let html = '';
  let inUl = false;
  let inOl = false;

  const closeList = () => {
    if (inUl) { html += '</ul>'; inUl = false; }
    if (inOl) { html += '</ol>'; inOl = false; }
  };

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      const label = inlineMarkdown(heading[2]);
      const withColon = level === 3 && !label.endsWith(':') ? `${label}:` : label;
      html += `<h${level}>${withColon}</h${level}>`;
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      if (!inUl) { closeList(); html += '<ul>'; inUl = true; }
      html += `<li>${inlineMarkdown(bullet[1])}</li>`;
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      if (!inOl) { closeList(); html += '<ol>'; inOl = true; }
      html += `<li>${inlineMarkdown(ordered[1])}</li>`;
      continue;
    }

    if (!line.trim()) {
      closeList();
      continue;
    }

    closeList();
    html += `<p>${inlineMarkdown(line)}</p>`;
  }

  closeList();
  return html;
}

function containsEmbeddedMarkdown(html: string): boolean {
  // Strip tags and check if the plain text still has markdown syntax
  const plain = html.replace(/<[^>]+>/g, '\n');
  return /^#{1,6}\s|\*\*[\s\S]+?\*\*/m.test(plain);
}

export function textToHtml(text: string): string {
  if (!text) return '';

  if (/<[a-z][\s\S]*>/i.test(text)) {
    // HTML that wraps raw markdown (e.g. old <p>## heading</p> format) — strip and re-parse
    if (containsEmbeddedMarkdown(text)) {
      const plain = text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      return parseMarkdown(plain);
    }
    // Proper HTML from the rich-text editor — pass through unchanged
    return text;
  }

  return parseMarkdown(text);
}
