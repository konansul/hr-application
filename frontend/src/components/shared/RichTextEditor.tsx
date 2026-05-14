import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
}

function ToolbarBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors select-none ${
        active
          ? 'bg-gray-900 dark:bg-white text-white dark:text-black'
          : 'text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-gray-200 dark:bg-neutral-700 mx-0.5 shrink-0" />;
}

export function RichTextEditor({ value, onChange, placeholder, disabled, minHeight = '220px' }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      Placeholder.configure({ placeholder: placeholder ?? 'Start writing…' }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none prose prose-sm dark:prose-invert max-w-none px-4 py-3',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || '';
    if (incoming !== current && !(incoming === '' && current === '<p></p>')) {
      editor.commands.setContent(incoming, false);
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) return null;

  const addLink = () => {
    const prev = editor.getAttributes('link').href ?? '';
    const url = window.prompt('Enter URL', prev);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="flex flex-col border border-gray-200 dark:border-neutral-700 rounded-xl overflow-hidden bg-white dark:bg-neutral-950">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900 flex-wrap shrink-0">
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
          <strong>B</strong>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
          <em>I</em>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)">
          <span className="underline">U</span>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <span className="line-through">S</span>
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1">
          H1
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
          H2
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
          H3
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /><circle cx="2" cy="6" r="1" fill="currentColor"/><circle cx="2" cy="12" r="1" fill="currentColor"/><circle cx="2" cy="18" r="1" fill="currentColor"/></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
        </ToolbarBtn>

        <Divider />

        <ToolbarBtn onClick={addLink} active={editor.isActive('link')} title="Insert link">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
        </ToolbarBtn>
      </div>

      <EditorContent
        editor={editor}
        style={{ minHeight }}
        className="flex-1 overflow-y-auto custom-scrollbar [&_.tiptap]:h-full [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:text-gray-400 [&_.tiptap_p.is-editor-empty:first-child::before]:dark:text-neutral-600 [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0"
      />
    </div>
  );
}
