import type { Editor } from '@tiptap/react';
import type { LucideIcon } from 'lucide-react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  SquareCode,
  List,
  ListOrdered,
  Quote,
  Link,
  Image,
  Minus,
  Undo2,
  Redo2,
  ChevronDown,
} from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Toolbar from '@radix-ui/react-toolbar';
import { button } from '../starwind/button/variants';
import { nativeSelect } from '../starwind/native-select/variants';
export default function EditorToolbar({
  editor,
  openLink,
  openImage,
  disabled,
}: {
  editor: Editor;
  openLink: () => void;
  openImage: () => void;
  disabled: boolean;
}) {
  const tool = (
    label: string,
    Icon: LucideIcon,
    action: () => void,
    active?: boolean,
    unavailable = false,
  ) => (
    <Tooltip.Root key={label}>
      <Tooltip.Trigger asChild>
        <Toolbar.Button asChild>
          <button
            type="button"
            aria-label={label}
            aria-pressed={active}
            disabled={disabled || unavailable}
            className={button({ variant: 'ghost', size: 'icon-sm', class: 'editor-tool' })}
            onMouseDown={(event) => event.preventDefault()}
            onClick={action}
          >
            <Icon size={17} aria-hidden="true" />
          </button>
        </Toolbar.Button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content sideOffset={8} className="editor-tooltip">
          {label}
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
  const heading = editor.isActive('heading')
    ? String(editor.getAttributes('heading').level)
    : 'paragraph';
  return (
    <Tooltip.Provider delayDuration={350}>
      <Toolbar.Root className="editor-toolbar" aria-label="Text formatting" loop>
        <div className="editor-style-select">
          <select
            className={nativeSelect({ size: 'sm' })}
            value={heading}
            disabled={disabled}
            aria-label="Text style"
            onChange={(event) => {
              if (event.target.value === 'paragraph') editor.chain().focus().setParagraph().run();
              else
                editor
                  .chain()
                  .focus()
                  .setHeading({ level: Number(event.target.value) as 1 | 2 | 3 | 4 })
                  .run();
            }}
          >
            <option value="paragraph">Paragraph</option>
            {[1, 2, 3, 4].map((level) => (
              <option key={level} value={level}>
                Heading {level}
              </option>
            ))}
          </select>
          <ChevronDown size={14} aria-hidden="true" />
        </div>
        <Toolbar.Separator className="editor-toolbar-separator" />
        <div role="group" aria-label="Inline formatting">
          {tool(
            'Bold (Ctrl/⌘ B)',
            Bold,
            () => editor.chain().focus().toggleBold().run(),
            editor.isActive('bold'),
          )}
          {tool(
            'Italic (Ctrl/⌘ I)',
            Italic,
            () => editor.chain().focus().toggleItalic().run(),
            editor.isActive('italic'),
          )}
          {tool(
            'Strikethrough',
            Strikethrough,
            () => editor.chain().focus().toggleStrike().run(),
            editor.isActive('strike'),
          )}
          {tool(
            'Inline code',
            Code,
            () => editor.chain().focus().toggleCode().run(),
            editor.isActive('code'),
          )}
        </div>
        <Toolbar.Separator className="editor-toolbar-separator" />
        <div role="group" aria-label="Block formatting">
          {tool(
            'Bullet list',
            List,
            () => editor.chain().focus().toggleBulletList().run(),
            editor.isActive('bulletList'),
          )}
          {tool(
            'Ordered list',
            ListOrdered,
            () => editor.chain().focus().toggleOrderedList().run(),
            editor.isActive('orderedList'),
          )}
          {tool(
            'Blockquote',
            Quote,
            () => editor.chain().focus().toggleBlockquote().run(),
            editor.isActive('blockquote'),
          )}
          {tool(
            'Code block',
            SquareCode,
            () => editor.chain().focus().toggleCodeBlock().run(),
            editor.isActive('codeBlock'),
          )}
        </div>
        <Toolbar.Separator className="editor-toolbar-separator" />
        <div role="group" aria-label="Insert content">
          {tool('Insert or edit link', Link, openLink, editor.isActive('link'))}
          {tool('Insert image', Image, openImage)}
          {tool('Horizontal rule', Minus, () => editor.chain().focus().setHorizontalRule().run())}
        </div>
        <Toolbar.Separator className="editor-toolbar-separator" />
        <div role="group" aria-label="History">
          {tool(
            'Undo',
            Undo2,
            () => editor.chain().focus().undo().run(),
            undefined,
            !editor.can().undo(),
          )}
          {tool(
            'Redo',
            Redo2,
            () => editor.chain().focus().redo().run(),
            undefined,
            !editor.can().redo(),
          )}
        </div>
      </Toolbar.Root>
    </Tooltip.Provider>
  );
}
