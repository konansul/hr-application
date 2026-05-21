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

export function textToHtml(text: string): string {
  if (!text) return '';
  // Already HTML — pass through
  if (/<[a-z][\s\S]*>/i.test(text)) return text;

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
      html += `<h${level}>${inlineMarkdown(heading[2])}</h${level}>`;
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
