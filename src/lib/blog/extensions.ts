import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
export function extensions() { return [StarterKit.configure({heading:{levels:[2,3,4]},underline:false,link:{openOnClick:false,protocols:['https','http','mailto']}}),Image.configure({allowBase64:false})]; }
