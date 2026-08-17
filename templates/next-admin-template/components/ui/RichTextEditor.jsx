'use client'

/**
 * Single WYSIWYG editor for the admin project.
 * Use this component for all rich text editing (product descriptions, content pages, etc.).
 */
import dynamic from 'next/dynamic'
import 'react-quill-new/dist/quill.snow.css'

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => (
    <div className="h-32 bg-secondary animate-pulse rounded-lg border border-border" />
  ),
})

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ color: [] }, { background: [] }],
    ['link', 'image'],
    ['clean'],
  ],
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write something...',
}) {
  return (
    <div className="rich-editor border border-border rounded-lg bg-input">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder}
      />

      <style jsx global>{`

        /* Toolbar */
        .rich-editor .ql-toolbar {
          background: var(--datatable-header);
          border-color: var(--datatable-border-strong);
        }

        /* Container */
        .rich-editor .ql-container {
          min-height: 140px;
          font-size: 14px;
          background: var(--datatable-bg);
          border-color: var(--datatable-border-strong);
          color: var(--foreground);
        }

        /* Editor area */
        .rich-editor .ql-editor {
          min-height: 140px;
          color: var(--foreground);
        }

        .rich-editor .ql-editor.ql-blank::before {
          color: var(--muted-foreground);
          opacity: 0.7;
        }

        /* Icons */
        .rich-editor .ql-stroke {
          stroke: var(--muted-foreground);
        }

        .rich-editor .ql-fill {
          fill: var(--muted-foreground);
        }

        .rich-editor .ql-picker-label {
          color: var(--muted-foreground);
        }

        /* Dropdown */
        .rich-editor .ql-picker-options {
          background: var(--card);
          border-color: var(--border);
          color: var(--foreground);
        }

        .rich-editor .ql-picker-item:hover {
          background: var(--secondary);
        }

        /* Focus state */
        .rich-editor .ql-container.ql-snow:focus-within {
          border-color: var(--ring);
          box-shadow: 0 0 0 1px var(--ring);
        }

      `}</style>
    </div>
  )
}
