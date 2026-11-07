import { Extension, type Editor } from '@tiptap/core';
import { Plugin, PluginKey, Selection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

// Upload markers live only in plugin state, never in persisted article JSON.
export const uploadKey = new PluginKey<DecorationSet>('imageUploads');
export const ImageUploads = Extension.create({
  name: 'imageUploads',
  addKeyboardShortcuts() {
    const moveToEdge = (edge: 'start' | 'end') => {
      if (!uploadKey.getState(this.editor.state)?.find().length) return false;
      // Native document navigation can stall beside a noneditable upload widget
      // in an empty paragraph. Use the document selection while uploads are pending.
      return this.editor.commands.command(({ tr }) => {
        tr.setSelection(edge === 'start' ? Selection.atStart(tr.doc) : Selection.atEnd(tr.doc));
        tr.scrollIntoView();
        return true;
      });
    };
    return {
      'Mod-Home': () => moveToEdge('start'),
      'Mod-End': () => moveToEdge('end'),
    };
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: uploadKey,
        state: {
          init: () => DecorationSet.empty,
          apply(transaction, previous) {
            let markers = previous.map(transaction.mapping, transaction.doc);
            const action = transaction.getMeta(uploadKey);
            if (action?.add) {
              const { id, pos, preview } = action.add;
              const widget = document.createElement('span');
              widget.className = 'image-upload-placeholder';
              widget.contentEditable = 'false';
              widget.setAttribute('role', 'status');
              const img = document.createElement('img');
              img.src = preview;
              img.alt = '';
              widget.append(img, document.createTextNode('Uploading image…'));
              markers = markers.add(transaction.doc, [
                Decoration.widget(pos, widget, { id, side: -1 }),
              ]);
            }
            if (action?.remove)
              markers = markers.remove(
                markers.find(undefined, undefined, (spec) => spec.id === action.remove),
              );
            return markers;
          },
        },
        props: { decorations: (state) => uploadKey.getState(state) },
      }),
    ];
  },
});
export function uploadPosition(editor: Editor, id: string): number | undefined {
  return uploadKey.getState(editor.state)?.find(undefined, undefined, (spec) => spec.id === id)[0]
    ?.from;
}
