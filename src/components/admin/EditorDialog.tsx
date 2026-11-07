import { useRef, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { button } from '../starwind/button/variants';
export default function EditorDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
  onCloseAutoFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  wide?: boolean;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="editor-dialog-overlay" />
        <Dialog.Content
          className={`editor-dialog ${wide ? 'editor-preview-dialog' : ''}`}
          onOpenAutoFocus={() => {
            returnFocus.current = document.activeElement as HTMLElement;
          }}
          onCloseAutoFocus={(event) => {
            if (onCloseAutoFocus) onCloseAutoFocus(event);
            else {
              event.preventDefault();
              returnFocus.current?.focus();
            }
          }}
        >
          <div className="editor-dialog-header">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Description>{description}</Dialog.Description>
          </div>
          {children}
          <Dialog.Close
            className={button({ variant: 'ghost', size: 'icon-sm', class: 'editor-dialog-close' })}
            aria-label={wide ? 'Close preview' : 'Close dialog'}
          >
            <X size={16} aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
