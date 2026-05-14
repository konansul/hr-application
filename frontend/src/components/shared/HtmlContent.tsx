import DOMPurify from 'dompurify';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
const ALLOWED: DOMPurify.Config = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
};

interface Props {
  html: string;
  className?: string;
}

export function HtmlContent({ html, className }: Props) {
  const clean = DOMPurify.sanitize(html || '', ALLOWED);
  return (
    <div
      className={`prose prose-gray dark:prose-invert max-w-none ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
