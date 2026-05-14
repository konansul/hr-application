export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function textToHtml(text: string): string {
  if (!text) return '';
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return text
    .split(/\n\n+/)
    .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}
