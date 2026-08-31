'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Underline from '@tiptap/extension-underline';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { 
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, 
  Link as LinkIcon, Image as ImageIcon, Table as TableIcon, 
  Type, Palette, Highlighter, AlignLeft, AlignCenter, AlignRight, 
  AlignJustify, Subscript as SubIcon, Superscript as SuperIcon,
  ChevronDown, X, Trash2, Plus, Minus, Maximize2, Columns, Rows,
  Combine, Split
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { transformHtmlContent } from '@/lib/media';

const RichTextEditor = ({ content, onChange }: { content: string; onChange: (html: string) => void }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline font-bold hover:text-primary/80 transition-colors',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-2xl max-w-full h-auto shadow-lg my-6',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-fixed w-full my-6 border border-border rounded-xl overflow-hidden',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'bg-secondary/50 font-bold border border-border p-3 text-left',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-border p-3 text-left',
        },
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Subscript,
      Superscript,
      Placeholder.configure({
        placeholder: 'Bắt đầu viết nội dung chuyên nghiệp tại đây...',
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none min-h-[400px] max-w-none px-6 py-6 transition-all',
      },
    },
  });

  // Sync content if it changes externally (important for initial load)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(transformHtmlContent(content));
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="w-full flex flex-col border border-border rounded-2xl overflow-hidden bg-card shadow-sm group focus-within:border-primary/40 transition-all">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-secondary/20 sticky top-0 z-10 backdrop-blur-md">
        {/* Basic Styles */}
        <div className="flex items-center gap-0.5 border-r border-border pr-1 mr-1">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded-lg transition-colors ${editor.isActive('bold') ? 'bg-primary text-white shadow-sm' : 'hover:bg-secondary'}`}
            title="Đậm"
          >
            <Bold size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded-lg transition-colors ${editor.isActive('italic') ? 'bg-primary text-white shadow-sm' : 'hover:bg-secondary'}`}
            title="Nghiêng"
          >
            <Italic size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded-lg transition-colors ${editor.isActive('underline') ? 'bg-primary text-white shadow-sm' : 'hover:bg-secondary'}`}
            title="Gạch chân"
          >
            <UnderlineIcon size={16} />
          </button>
        </div>

        {/* Headings */}
        <div className="flex items-center gap-0.5 border-r border-border pr-1 mr-1">
          {[1, 2, 3].map((level) => (
            <button
              key={level}
              onClick={() => editor.chain().focus().toggleHeading({ level: level as any }).run()}
              className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${editor.isActive('heading', { level }) ? 'bg-primary text-white shadow-sm' : 'hover:bg-secondary text-muted-foreground'}`}
              title={`Tiêu đề ${level}`}
            >
              H{level}
            </button>
          ))}
        </div>

        {/* Lists */}
        <div className="flex items-center gap-0.5 border-r border-border pr-1 mr-1">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded-lg transition-colors ${editor.isActive('bulletList') ? 'bg-primary text-white shadow-sm' : 'hover:bg-secondary'}`}
            title="Danh sách dấu chấm"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded-lg transition-colors ${editor.isActive('orderedList') ? 'bg-primary text-white shadow-sm' : 'hover:bg-secondary'}`}
            title="Danh sách số"
          >
            <ListOrdered size={16} />
          </button>
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-0.5 border-r border-border pr-1 mr-1">
          <button
            onClick={() => (editor.chain().focus() as any).setTextAlign('left').run()}
            className={`p-1.5 rounded-lg transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-primary text-white shadow-sm' : 'hover:bg-secondary'}`}
            title="Căn trái"
          >
            <AlignLeft size={16} />
          </button>
          <button
            onClick={() => (editor.chain().focus() as any).setTextAlign('center').run()}
            className={`p-1.5 rounded-lg transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-primary text-white shadow-sm' : 'hover:bg-secondary'}`}
            title="Căn giữa"
          >
            <AlignCenter size={16} />
          </button>
          <button
            onClick={() => (editor.chain().focus() as any).setTextAlign('right').run()}
            className={`p-1.5 rounded-lg transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-primary text-white shadow-sm' : 'hover:bg-secondary'}`}
            title="Căn phải"
          >
            <AlignRight size={16} />
          </button>
          <button
            onClick={() => (editor.chain().focus() as any).setTextAlign('justify').run()}
            className={`p-1.5 rounded-lg transition-colors ${editor.isActive({ textAlign: 'justify' }) ? 'bg-primary text-white shadow-sm' : 'hover:bg-secondary'}`}
            title="Căn đều"
          >
            <AlignJustify size={16} />
          </button>
        </div>

        {/* Sub/Super script */}
        <div className="flex items-center gap-0.5 border-r border-border pr-1 mr-1">
          <button
            onClick={() => (editor.chain().focus() as any).toggleSubscript().run()}
            className={`p-1.5 rounded-lg transition-colors ${editor.isActive('subscript') ? 'bg-primary text-white shadow-sm' : 'hover:bg-secondary'}`}
            title="Chỉ số dưới"
          >
            <SubIcon size={16} />
          </button>
          <button
            onClick={() => (editor.chain().focus() as any).toggleSuperscript().run()}
            className={`p-1.5 rounded-lg transition-colors ${editor.isActive('superscript') ? 'bg-primary text-white shadow-sm' : 'hover:bg-secondary'}`}
            title="Chỉ số trên"
          >
            <SuperIcon size={16} />
          </button>
        </div>

        {/* Links & Images */}
        <div className="flex items-center gap-0.5 border-r border-border pr-1 mr-1">
          <button
            onClick={() => {
              const url = window.prompt('Nhập URL liên kết:');
              if (url) (editor.chain().focus() as any).setLink({ href: url }).run();
            }}
            className={`p-1.5 rounded-lg transition-colors ${editor.isActive('link') ? 'bg-primary text-white shadow-sm' : 'hover:bg-secondary'}`}
            title="Thêm liên kết"
          >
            <LinkIcon size={16} />
          </button>
          <button
            onClick={() => {
              const url = window.prompt('Nhập URL ảnh:');
              if (url) (editor.chain().focus() as any).setImage({ src: url }).run();
            }}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
            title="Thêm ảnh"
          >
            <ImageIcon size={16} />
          </button>
        </div>

        {/* Color & Highlight */}
        <div className="flex items-center gap-0.5 border-r border-border pr-1 mr-1">
          <input
            type="color"
            onInput={(e) => (editor.chain().focus() as any).setColor((e.target as HTMLInputElement).value).run()}
            className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer"
            title="Màu chữ"
          />
          <button
            onClick={() => (editor.chain().focus() as any).toggleHighlight().run()}
            className={`p-1.5 rounded-lg transition-colors ${editor.isActive('highlight') ? 'bg-primary text-white shadow-sm' : 'hover:bg-secondary'}`}
            title="Tô màu nền"
          >
            <Highlighter size={16} />
          </button>
        </div>

        {/* Tables */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => (editor.chain().focus() as any).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
            title="Tạo bảng"
          >
            <TableIcon size={16} />
          </button>
          {editor.isActive('table') && (
            <div className="flex items-center gap-0.5 ml-1 animate-in slide-in-from-left duration-200">
              <button onClick={() => (editor.chain().focus() as any).addColumnBefore().run()} className="p-1 hover:bg-secondary rounded" title="Thêm cột trước"><Columns size={14} className="rotate-180" /></button>
              <button onClick={() => (editor.chain().focus() as any).addColumnAfter().run()} className="p-1 hover:bg-secondary rounded" title="Thêm cột sau"><Columns size={14} /></button>
              <button onClick={() => (editor.chain().focus() as any).deleteColumn().run()} className="p-1 hover:bg-red-500/10 text-red-500 rounded" title="Xóa cột"><X size={14} /></button>
              <div className="w-px h-4 bg-border mx-1" />
              <button onClick={() => (editor.chain().focus() as any).addRowBefore().run()} className="p-1 hover:bg-secondary rounded" title="Thêm hàng trước"><Rows size={14} className="rotate-180" /></button>
              <button onClick={() => (editor.chain().focus() as any).addRowAfter().run()} className="p-1 hover:bg-secondary rounded" title="Thêm hàng sau"><Rows size={14} /></button>
              <button onClick={() => (editor.chain().focus() as any).deleteRow().run()} className="p-1 hover:bg-red-500/10 text-red-500 rounded" title="Xóa hàng"><X size={14} /></button>
              <div className="w-px h-4 bg-border mx-1" />
              <button onClick={() => (editor.chain().focus() as any).mergeCells().run()} className="p-1 hover:bg-secondary rounded" title="Gộp ô"><Combine size={14} /></button>
              <button onClick={() => (editor.chain().focus() as any).splitCell().run()} className="p-1 hover:bg-secondary rounded" title="Tách ô"><Split size={14} /></button>
              <div className="w-px h-4 bg-border mx-1" />
              <button onClick={() => (editor.chain().focus() as any).deleteTable().run()} className="p-1 hover:bg-red-500 text-white rounded bg-red-500/80" title="Xóa bảng"><Trash2 size={14} /></button>
            </div>
          )}
        </div>
      </div>

      <EditorContent editor={editor} className="bg-background" />

      <style jsx global>{`
        .ProseMirror {
          min-height: 400px;
        }
        .ProseMirror table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 0;
          overflow: hidden;
        }
        .ProseMirror td,
        .ProseMirror th {
          min-width: 1em;
          border: 1px solid #e2e8f0;
          padding: 8px 12px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }
        .ProseMirror th {
          font-weight: bold;
          text-align: left;
          background-color: rgba(0, 0, 0, 0.05);
        }
        .ProseMirror .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: -2px;
          width: 4px;
          background-color: #3b82f6;
          pointer-events: none;
        }
        .ProseMirror.resize-cursor {
          cursor: ew-resize;
          cursor: col-resize;
        }
        .ProseMirror .selectedCell:after {
          z-index: 2;
          position: absolute;
          content: "";
          left: 0; right: 0; top: 0; bottom: 0;
          background: rgba(59, 130, 246, 0.1);
          pointer-events: none;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
