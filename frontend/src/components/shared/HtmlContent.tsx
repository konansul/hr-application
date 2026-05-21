import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
const ALLOWED: DOMPurify.Config = {
  ALLOWED_TAGS: ['p', 'br', 'hr', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
};

interface Props {
  html: string;
  className?: string;
}

const JOB_DESC_STYLES = [
  '[&_h1]:text-[13px] [&_h1]:font-bold [&_h1]:text-gray-800 dark:[&_h1]:text-neutral-100 [&_h1]:mt-4 [&_h1]:mb-1 [&_h1]:tracking-tight',
  '[&_h2]:text-[13px] [&_h2]:font-bold [&_h2]:text-gray-800 dark:[&_h2]:text-neutral-100 [&_h2]:mt-4 [&_h2]:mb-1 [&_h2]:tracking-tight',
  '[&_h3]:text-[13px] [&_h3]:font-bold [&_h3]:text-gray-800 dark:[&_h3]:text-neutral-100 [&_h3]:mt-3 [&_h3]:mb-0.5',
  '[&_p]:mb-2 [&_p]:leading-relaxed',
  '[&_ul]:mb-2 [&_ul]:ml-4 [&_ul]:list-disc [&_ul]:space-y-0.5',
  '[&_ol]:mb-2 [&_ol]:ml-4 [&_ol]:list-decimal [&_ol]:space-y-0.5',
  '[&_li]:leading-relaxed',
  '[&_strong]:font-semibold [&_strong]:text-gray-800 dark:[&_strong]:text-neutral-200',
  '[&_em]:italic',
  '[&_a]:text-indigo-600 dark:[&_a]:text-indigo-400 [&_a]:underline [&_a]:underline-offset-2',
  '[&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 dark:[&_blockquote]:border-neutral-600 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-gray-500 dark:[&_blockquote]:text-neutral-400',
  '[&_hr]:border-gray-200 dark:[&_hr]:border-neutral-700 [&_hr]:my-3',
  '[&_code]:bg-gray-100 dark:[&_code]:bg-neutral-800 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono',
].join(' ');

function looksLikeMarkdown(text: string): boolean {
  return /^#{1,6}\s|\*\*[\s\S]+?\*\*|^[-*]\s|^>\s/m.test(text);
}

export function HtmlContent({ html, className }: Props) {
  const content = html || '';
  const base = `text-sm leading-relaxed ${JOB_DESC_STYLES} ${className ?? ''}`;

  if (looksLikeMarkdown(content)) {
    return (
      <div className={base}>
        <ReactMarkdown
          components={{
            h3: ({ children }) => {
              const text = String(children ?? '');
              return <h3>{text.endsWith(':') ? text : `${text}:`}</h3>;
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  const clean = DOMPurify.sanitize(content, ALLOWED);
  return (
    <div
      className={base}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
