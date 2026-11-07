import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
export function extensions({ codeBlock = true }: { codeBlock?: boolean } = {}) {
  return [
    StarterKit.configure({
      codeBlock: codeBlock ? {} : false,
      heading: { levels: [1, 2, 3, 4] },
      underline: false,
      link: { openOnClick: false, protocols: ['https', 'http', 'mailto'] },
    }),
    Image.configure({ allowBase64: false }),
  ];
}
