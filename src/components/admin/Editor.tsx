import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import { Selection } from '@tiptap/pm/state';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { Eye, Save, ArrowUpRight, Search, Globe, FileText } from 'lucide-react';
import { extensions } from '../../lib/blog/extensions';
import { safeUrl } from '../../lib/blog/urls';
import { button } from '../starwind/button/variants';
import { input } from '../starwind/input/variants';
import { textarea } from '../starwind/textarea/variants';
import { nativeSelect } from '../starwind/native-select/variants';
import { card, cardContent, cardHeader } from '../starwind/card/variants';
import { toast, redirectWithNotice } from '../../lib/notifications';
import '../starwind/prose/styles.css';
import '../../styles/editor.css';
import EditorDialog from './EditorDialog';
import EditorToolbar from './EditorToolbar';
import { ImageUploads, uploadKey, uploadPosition } from './image-upload';
type Post = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  contentJson: JSONContent;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  status: 'draft' | 'published';
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  categories: { id: string }[];
};
const lowlight = createLowlight(common);
const slugify = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 160)
    .replace(/-$/, '');
function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
      {error && (
        <span id={`${id}-error`} className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
function Panel({
  title,
  description,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={card({ class: `editor-panel ${className}` })}>
      <div className={cardHeader()}>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <div className={cardContent()}>{children}</div>
    </section>
  );
}
export default function Editor({
  post,
  categories,
  uploadsEnabled,
}: {
  post?: Post;
  categories: { id: string; name: string }[];
  uploadsEnabled: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const previewTrigger = useRef<HTMLButtonElement>(null);
  const allowLeave = useRef(false);
  const selection = useRef<{ from: number; to: number } | null>(null);
  const [title, setTitle] = useState(post?.title || '');
  const [slug, setSlug] = useState(post?.slug || '');
  const manualSlug = useRef(!!post?.slug);
  const [cover, setCover] = useState(post?.coverImageUrl || '');
  const [selected, setSelected] = useState(post?.categories.map((c) => c.id) || []);
  const [categorySearch, setCategorySearch] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const uploadInFlight = useRef(false);
  const uploadHandler = useRef<(file: File, pos?: number) => void>(() => {});
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [modal, setModal] = useState<'link' | 'image' | 'unpublish' | null>(null);
  const [modalError, setModalError] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [preview, setPreview] = useState<{
    html: string;
    title: string;
    excerpt: string;
    alt: string;
    cover: string;
  } | null>(null);
  const [coverFailed, setCoverFailed] = useState(false);
  const editor = useEditor({
    extensions: [
      ...extensions({ codeBlock: false }),
      ImageUploads,
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: 'plaintext' }),
      Placeholder.configure({
        placeholder: 'Start writing. Share what you learned, one thought at a time…',
      }),
    ],
    content: post?.contentJson || { type: 'doc', content: [{ type: 'paragraph' }] },
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    onUpdate: () => setDirty(true),
    onTransaction: ({ transaction }) => {
      if (selection.current && transaction.docChanged) {
        selection.current = {
          from: transaction.mapping.map(selection.current.from),
          to: transaction.mapping.map(selection.current.to),
        };
      }
    },
    editorProps: {
      handlePaste: (_view, event) => {
        const file = Array.from(event.clipboardData?.files || []).find((file) =>
          file.type.startsWith('image/'),
        );
        if (!file || !uploadsEnabled) return false;
        event.preventDefault();
        uploadHandler.current(file);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        const file = event.dataTransfer?.files[0];
        if (moved || !file || !uploadsEnabled) return false;
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        if (pos === undefined) return false;
        event.preventDefault();
        uploadHandler.current(file, pos);
        return true;
      },
      attributes: {
        class: 'sw-prose prose editor-prose',
        role: 'textbox',
        'aria-label': 'Article content',
        'aria-multiline': 'true',
      },
    },
  });
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if ((dirty || uploading) && !allowLeave.current) {
        event.preventDefault();
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty, uploading]);
  useEffect(() => {
    if (busy) return;
    const first = Object.keys(errors)[0];
    if (!first) return;
    const names: Record<string, string> = {
      coverImageUrl: 'cover',
      coverImageAlt: 'cover-alt',
      seoTitle: 'seo-title',
      seoDescription: 'seo-description',
    };
    document.getElementById(names[first] || first)?.focus();
  }, [busy, errors]);
  const attrs = (name: string, id = name) => ({
    'aria-invalid': !!errors[name],
    'aria-describedby': errors[name]
      ? `${id}-error`
      : ['slug', 'excerpt', 'coverImageAlt', 'seoTitle', 'seoDescription'].includes(name)
        ? `${id}-hint`
        : undefined,
  });
  async function save(status: 'draft' | 'published') {
    const form = formRef.current;
    if (!editor || !form || busy || uploading || !form.reportValidity()) return;
    if (cover && !safeUrl(cover, true)) {
      setErrors({ coverImageUrl: 'Use an HTTPS image URL.' });
      document.getElementById('cover')?.focus();
      return;
    }
    setBusy(true);
    setErrors({});
    setMessage('Saving your article…');
    const notice = toast.loading('Saving article…');
    const data = new FormData(form);
    try {
      const response = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: post?.id,
          title,
          slug,
          excerpt: data.get('excerpt'),
          contentJson: editor.getJSON(),
          coverImageUrl: cover,
          coverImageAlt: data.get('coverImageAlt'),
          seoTitle: data.get('seoTitle'),
          seoDescription: data.get('seoDescription'),
          isFeatured: data.get('isFeatured') === 'on',
          categoryIds: selected,
          status,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setErrors(result.fieldErrors || {});
        throw Error(result.error || 'Unable to save.');
      }
      allowLeave.current = true;
      setDirty(false);
      toast.dismiss(notice);
      redirectWithNotice(
        `/admin/posts/${result.id}`,
        status === 'published'
          ? post?.status === 'published'
            ? 'articleUpdated'
            : 'articlePublished'
          : post?.status === 'published'
            ? 'articleUnpublished'
            : post?.id
              ? 'draftSaved'
              : 'articleCreated',
      );
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Unable to save. Please try again.';
      setMessage(text);
      toast.error(text, { id: notice });
    } finally {
      setBusy(false);
    }
  }
  async function showPreview() {
    if (!editor || busy || uploading) return;
    setBusy(true);
    const notice = toast.loading('Preparing preview…');
    try {
      const response = await fetch('/api/admin/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentJson: editor.getJSON() }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      const formData = new FormData(formRef.current!);
      setPreview({
        html: data.html,
        title,
        excerpt: String(formData.get('excerpt') || ''),
        alt: String(formData.get('coverImageAlt') || ''),
        cover: safeUrl(cover, true) ? cover : '',
      });
      toast.success('Preview ready.', { id: notice });
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Preview failed.';
      setMessage(text);
      toast.error(text, { id: notice });
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File | undefined, target: 'cover' | 'inline', position?: number) {
    if (!file || busy || uploadInFlight.current || !editor) return;
    if (file.size > 3_000_000 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      const text = 'Choose a PNG, JPEG, or WebP image up to 3 MB.';
      if (target === 'inline') {
        setModal('image');
        setModalError(text);
      } else setErrors({ coverImageUrl: text });
      toast.error(text);
      return;
    }
    const id = crypto.randomUUID();
    const preview = URL.createObjectURL(file);
    const alt =
      (position === undefined ? imageAlt.trim() : '') ||
      file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]/g, ' ')
        .slice(0, 300) ||
      'Article image';
    if (target === 'inline') {
      const pos = position ?? selection.current?.from ?? editor.state.selection.from;
      editor.view.dispatch(editor.state.tr.setMeta(uploadKey, { add: { id, pos, preview } }));
      setModal(null);
    }
    const initialDoc = editor.state.doc;
    const initialSelection = editor.state.selection;
    uploadInFlight.current = true;
    setUploading(true);
    setModalError('');
    const notice = toast.loading('Uploading image…');
    try {
      const data = new FormData();
      data.set('file', file);
      const response = await fetch('/api/admin/upload', { method: 'POST', body: data });
      const result = await response.json();
      if (!response.ok || !safeUrl(result.url, true))
        throw Error(result.error || 'Image upload failed. Try again.');
      if (editor.isDestroyed) {
        toast.dismiss(notice);
        return;
      }
      if (target === 'cover') {
        setCover(result.url);
        setCoverFailed(false);
        setErrors((previous) => {
          const next = { ...previous };
          delete next.coverImageUrl;
          return next;
        });
        setDirty(true);
      } else {
        const pos = uploadPosition(editor, id);
        if (pos === undefined)
          throw Error('The insertion location was removed. Choose the image again to retry.');
        const continueBelow =
          editor.state.doc.eq(initialDoc) && editor.state.selection.eq(initialSelection);
        const inserted = editor
          .chain()
          .insertContentAt(
            pos,
            { type: 'image', attrs: { src: result.url, alt } },
            { updateSelection: false },
          )
          .setMeta(uploadKey, { remove: id })
          .run();
        if (!inserted)
          throw Error('Unable to insert the image here. Choose another position and retry.');
        if (continueBelow) {
          // A trailing paragraph is added by StarterKit before this selection update.
          // If the user edited or moved the cursor meanwhile, keep their live selection.
          let after: number | undefined;
          editor.state.doc.descendants((node, pos) => {
            if (node.type.name === 'image' && node.attrs.src === result.url)
              after = pos + node.nodeSize;
          });
          if (after !== undefined)
            editor.commands.command(({ tr }) => {
              tr.setSelection(Selection.near(tr.doc.resolve(after!), 1));
              return true;
            });
        }
      }
      toast.success(
        target === 'inline' ? 'Image uploaded and inserted.' : 'Cover image uploaded.',
        { id: notice },
      );
    } catch (error) {
      const text =
        error instanceof Error ? error.message : 'Upload failed. Choose the file again to retry.';
      if (target === 'inline') {
        setModal('image');
        setModalError(text);
      } else setErrors({ coverImageUrl: text });
      toast.error(text, { id: notice });
    } finally {
      if (!editor.isDestroyed)
        editor.view.dispatch(editor.state.tr.setMeta(uploadKey, { remove: id }));
      URL.revokeObjectURL(preview);
      uploadInFlight.current = false;
      setUploading(false);
    }
  }
  uploadHandler.current = (file, pos) => {
    selection.current = null;
    void upload(file, 'inline', pos ?? editor?.state.selection.from);
  };
  function openInsertion(kind: 'link' | 'image') {
    if (!editor) return;
    selection.current = { from: editor.state.selection.from, to: editor.state.selection.to };
    if (kind === 'link') setLinkUrl(editor.getAttributes('link').href || '');
    else {
      setImageUrl('');
      setImageAlt('');
    }
    setModalError('');
    setModal(kind);
  }
  function restoreSelection() {
    if (!editor) return null;
    const chain = editor.chain().focus();
    return selection.current ? chain.setTextSelection(selection.current) : chain;
  }
  function insert() {
    if (modal === 'link') {
      if (!safeUrl(linkUrl)) {
        setModalError('Enter a valid HTTP, HTTPS, or mailto URL.');
        return;
      }
      restoreSelection()?.extendMarkRange('link').setLink({ href: linkUrl }).run();
    } else if (modal === 'image') {
      if (!safeUrl(imageUrl, true)) {
        setModalError('Images require a valid HTTPS URL.');
        return;
      }
      if (!imageAlt.trim()) {
        setModalError('Add alternative text describing this image.');
        return;
      }
      if (editor)
        editor
          .chain()
          .focus()
          .insertContentAt(selection.current?.from ?? editor.state.selection.from, {
            type: 'image',
            attrs: { src: imageUrl, alt: imageAlt.trim() },
          })
          .run();
    }
    setModal(null);
  }
  const status = post?.status || 'draft';
  const visibleCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(categorySearch.toLowerCase()),
  );
  return (
    <>
      <form
        ref={formRef}
        className="article-editor"
        onChange={() => setDirty(true)}
        onSubmit={(event) => {
          event.preventDefault();
          void save(status);
        }}
      >
        <fieldset className="editor-controls" disabled={busy || !editor}>
          <legend className="sr-only">Article editor</legend>
          <div className="editor-layout">
            <div className="editor-sections">
              <Panel
                title="The essentials"
                description="A clear title. A little context. Your words."
              >
                <Field id="title" label="Title" error={errors.title}>
                  <input
                    className={input()}
                    id="title"
                    name="title"
                    required
                    maxLength={200}
                    placeholder="Give your idea a title…"
                    value={title}
                    {...attrs('title')}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      if (!manualSlug.current) setSlug(slugify(event.target.value));
                    }}
                  />
                </Field>
                <Field
                  id="slug"
                  label="URL slug"
                  hint={`Your article lives at /blog/${slug || 'your-article'}`}
                  error={errors.slug}
                >
                  <input
                    className={input()}
                    id="slug"
                    name="slug"
                    required
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    maxLength={160}
                    placeholder="your-article"
                    value={slug}
                    {...attrs('slug')}
                    onChange={(event) => {
                      manualSlug.current = !!event.target.value;
                      setSlug(event.target.value);
                    }}
                  />
                </Field>
                <Field
                  id="excerpt"
                  label="Excerpt"
                  hint="A short introduction for article cards. Up to 500 characters."
                  error={errors.excerpt}
                >
                  <textarea
                    className={textarea()}
                    id="excerpt"
                    name="excerpt"
                    rows={3}
                    maxLength={500}
                    placeholder="What will the reader take away?"
                    defaultValue={post?.excerpt}
                    {...attrs('excerpt')}
                  />
                </Field>
              </Panel>
              <section className="writing-surface" aria-label="Writing area">
                <div className="writing-surface-heading">
                  <h2>Article content</h2>
                  <span className="meta">Markdown shortcuts supported</span>
                </div>
                {editor ? (
                  <EditorToolbar
                    editor={editor}
                    openLink={() => openInsertion('link')}
                    openImage={() => openInsertion('image')}
                    disabled={busy || uploading}
                  />
                ) : (
                  <p className="notice" role="status">
                    Preparing your writing space…
                  </p>
                )}
                {editor?.isActive('codeBlock') && (
                  <div className="code-language">
                    <label htmlFor="code-language">Code language</label>
                    <select
                      id="code-language"
                      className={nativeSelect({ size: 'sm' })}
                      value={editor.getAttributes('codeBlock').language || 'plaintext'}
                      onChange={(event) =>
                        editor
                          .chain()
                          .focus()
                          .updateAttributes('codeBlock', { language: event.target.value })
                          .run()
                      }
                    >
                      {[
                        'plaintext',
                        'javascript',
                        'typescript',
                        'python',
                        'php',
                        'bash',
                        'json',
                        'sql',
                        'css',
                        'html',
                        'cpp',
                        'java',
                        'rust',
                        'go',
                      ].map((language) => (
                        <option key={language} value={language}>
                          {language}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <EditorContent editor={editor} />
                {errors.contentJson && (
                  <p className="field-error" role="alert">
                    {errors.contentJson}
                  </p>
                )}
                <div className="editor-word-count meta">
                  {editor?.getText().trim().split(/\s+/).filter(Boolean).length || 0} words
                  <span>Saved only when you choose an action below</span>
                </div>
              </section>
              <Panel title="Cover image">
                {cover && safeUrl(cover, true) && !coverFailed && (
                  <img
                    className="editor-cover-preview"
                    src={cover}
                    alt="Cover preview"
                    onError={() => setCoverFailed(true)}
                  />
                )}
                {coverFailed && (
                  <p className="field-error">The image couldn't be loaded. Check the URL.</p>
                )}
                <Field id="cover" label="Cover image URL (HTTPS)" error={errors.coverImageUrl}>
                  <input
                    className={input()}
                    id="cover"
                    type="text"
                    inputMode="url"
                    value={cover}
                    placeholder="https://…"
                    {...attrs('coverImageUrl', 'cover')}
                    onChange={(event) => {
                      setCover(event.target.value);
                      setCoverFailed(false);
                    }}
                  />
                </Field>
                <Field
                  id="cover-alt"
                  label="Cover alternative text"
                  hint="Describe the image for people using screen readers."
                  error={errors.coverImageAlt}
                >
                  <input
                    className={input()}
                    id="cover-alt"
                    name="coverImageAlt"
                    required={!!cover}
                    maxLength={300}
                    placeholder="What does this image show?"
                    defaultValue={post?.coverImageAlt || ''}
                    {...attrs('coverImageAlt', 'cover-alt')}
                  />
                </Field>
                {uploadsEnabled && (
                  <Field
                    id="upload"
                    label="Upload cover image"
                    hint="PNG, JPEG, or WebP. Up to 3 MB."
                  >
                    <input
                      className={input()}
                      id="upload"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={uploading}
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0];
                        event.currentTarget.value = '';
                        void upload(file, 'cover');
                      }}
                    />
                  </Field>
                )}
                {!uploadsEnabled && (
                  <p className="field-description">Add an image using a hosted HTTPS URL.</p>
                )}
              </Panel>
              <Panel title="Categories">
                <div className="category-selection-summary">
                  <span>{selected.length} selected</span>
                  <a href="/admin/categories" target="_blank" rel="noopener noreferrer">
                    Manage ↗
                  </a>
                </div>
                {categories.length > 5 && (
                  <div className="editor-category-search">
                    <Search size={14} aria-hidden="true" />
                    <input
                      className={input({ size: 'sm' })}
                      type="search"
                      aria-label="Find article categories"
                      placeholder="Find a category…"
                      value={categorySearch}
                      onChange={(event) => setCategorySearch(event.target.value)}
                    />
                  </div>
                )}
                <fieldset className="category-checkbox-group">
                  <legend className="sr-only">Assign categories</legend>
                  {visibleCategories.map((category) => (
                    <label className="editor-checkbox" key={category.id}>
                      <input
                        type="checkbox"
                        name="categoryIds"
                        value={category.id}
                        checked={selected.includes(category.id)}
                        onChange={(event) =>
                          setSelected((previous) =>
                            event.target.checked
                              ? [...previous, category.id]
                              : previous.filter((id) => id !== category.id),
                          )
                        }
                      />
                      <span>{category.name}</span>
                    </label>
                  ))}
                </fieldset>
                {!visibleCategories.length && (
                  <p className="field-description">
                    {categories.length
                      ? 'No matching categories.'
                      : 'No categories yet. Create one to organize your writing.'}
                  </p>
                )}
                {errors.categoryIds && (
                  <p className="field-error" role="alert">
                    {errors.categoryIds}
                  </p>
                )}
              </Panel>
              <Panel
                title="Search appearance"
                description="Optional details for search engines and shared links."
              >
                <Field
                  id="seo-title"
                  label="SEO title"
                  hint="Up to 70 characters. Defaults to your article title."
                  error={errors.seoTitle}
                >
                  <input
                    className={input()}
                    id="seo-title"
                    name="seoTitle"
                    maxLength={70}
                    placeholder={title || 'Article title'}
                    defaultValue={post?.seoTitle || ''}
                    {...attrs('seoTitle', 'seo-title')}
                  />
                </Field>
                <Field
                  id="seo-description"
                  label="SEO description"
                  hint="Up to 170 characters. Defaults to your excerpt."
                  error={errors.seoDescription}
                >
                  <textarea
                    className={textarea()}
                    id="seo-description"
                    name="seoDescription"
                    maxLength={170}
                    rows={3}
                    placeholder="A concise description for search results…"
                    defaultValue={post?.seoDescription || ''}
                    {...attrs('seoDescription', 'seo-description')}
                  />
                </Field>
              </Panel>
              <Panel title="Publication">
                <div className="publication-status">
                  {status === 'published' ? (
                    <Globe size={16} aria-hidden="true" />
                  ) : (
                    <FileText size={16} aria-hidden="true" />
                  )}
                  <span>{status === 'published' ? 'Published' : 'Draft'}</span>
                  <span className="meta">{status === 'published' ? 'Live' : 'Private'}</span>
                </div>
                <p className="field-description">
                  {status === 'published'
                    ? 'Your article is live. Saving updates keeps it published.'
                    : 'Only you can see this article until you publish it.'}
                </p>
                <label className="editor-checkbox feature-checkbox">
                  <input type="checkbox" name="isFeatured" defaultChecked={post?.isFeatured} />
                  <span>
                    Feature this article<small>Highlight it on the writing page.</small>
                  </span>
                </label>
              </Panel>
            </div>
          </div>
        </fieldset>
        <div className="editor-save-bar">
          <div className="editor-save-state" role="status" aria-live="polite">
            {uploading
              ? 'Uploading image… You can keep writing.'
              : busy
                ? 'Working…'
                : message ||
                  (dirty
                    ? 'Unsaved changes'
                    : post?.id
                      ? 'All changes saved'
                      : 'New draft · not saved yet')}
            <span className={dirty ? 'unsaved-dot' : 'saved-dot'} aria-hidden="true" />
          </div>
          <div className="actions">
            <button
              className={button({ variant: 'ghost', size: 'sm' })}
              type="button"
              disabled={busy || uploading || !editor}
              ref={previewTrigger}
              onClick={() => void showPreview()}
            >
              <Eye size={16} aria-hidden="true" />
              Preview
            </button>
            {status === 'published' ? (
              <>
                <button
                  className={button({ variant: 'outline', size: 'sm' })}
                  type="button"
                  disabled={busy || uploading}
                  onClick={() => {
                    setModalError('');
                    setModal('unpublish');
                  }}
                >
                  Unpublish
                </button>
                <button
                  className={button({ variant: 'primary', size: 'sm' })}
                  type="submit"
                  disabled={busy || uploading || !editor}
                >
                  <Save size={16} aria-hidden="true" />
                  Update article
                </button>
              </>
            ) : (
              <>
                <button
                  className={button({ variant: 'outline', size: 'sm' })}
                  type="submit"
                  disabled={busy || uploading || !editor}
                >
                  <Save size={16} aria-hidden="true" />
                  Save draft
                </button>
                <button
                  className={button({ variant: 'primary', size: 'sm' })}
                  type="button"
                  disabled={busy || uploading || !editor}
                  onClick={() => void save('published')}
                >
                  Publish
                  <ArrowUpRight size={16} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>
      </form>
      <EditorDialog
        open={modal === 'link' || modal === 'image'}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
        title={modal === 'link' ? 'Insert a link' : 'Insert an image'}
        description={
          modal === 'link'
            ? 'Apply a link to the text you selected.'
            : 'Add an image to your article with descriptive alternative text.'
        }
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          editor?.commands.focus();
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            insert();
          }}
        >
          {modal === 'link' ? (
            <Field id="link-url" label="Link URL">
              <input
                className={input()}
                id="link-url"
                required
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="https://example.com"
              />
            </Field>
          ) : (
            <>
              <Field id="inline-image" label="Inline image URL (HTTPS)">
                <input
                  className={input()}
                  id="inline-image"
                  type="url"
                  required
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  placeholder="https://…"
                />
              </Field>
              <Field id="inline-alt" label="Image alternative text">
                <input
                  className={input()}
                  id="inline-alt"
                  required
                  maxLength={300}
                  value={imageAlt}
                  onChange={(event) => setImageAlt(event.target.value)}
                  placeholder="Describe this image…"
                />
              </Field>
              {uploadsEnabled && (
                <Field
                  id="inline-upload"
                  label="Upload from device"
                  hint="PNG, JPEG, or WebP up to 3 MB. Inserts automatically; add alternative text first, or the filename is used. Choose the file again to retry a failed upload."
                >
                  <input
                    className={input()}
                    type="file"
                    id="inline-upload"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={busy || uploading}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = '';
                      void upload(file, 'inline');
                    }}
                  />
                </Field>
              )}
            </>
          )}
          {modalError && (
            <p className="field-error" role="alert">
              {modalError}
            </p>
          )}
          <div className="actions dialog-actions">
            {modal === 'link' && (
              <button
                className={button({ variant: 'ghost', size: 'sm' })}
                type="button"
                disabled={busy || uploading}
                onClick={() => {
                  restoreSelection()?.extendMarkRange('link').unsetLink().run();
                  setModal(null);
                }}
              >
                Remove link
              </button>
            )}
            <button
              className={button({ variant: 'outline', size: 'sm' })}
              type="button"
              disabled={busy || uploading}
              onClick={() => setModal(null)}
            >
              Cancel
            </button>
            <button
              className={button({ variant: 'primary', size: 'sm' })}
              type="submit"
              disabled={busy || uploading}
            >
              {modal === 'link' ? 'Apply link' : 'Insert image'}
            </button>
          </div>
        </form>
      </EditorDialog>
      <EditorDialog
        open={modal === 'unpublish'}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
        title="Move this article to drafts?"
        description="Readers will no longer be able to access it. Your current edits will be saved as a draft."
      >
        <div className="actions dialog-actions">
          <button
            className={button({ variant: 'outline', size: 'sm' })}
            type="button"
            onClick={() => setModal(null)}
          >
            Cancel
          </button>
          <button
            className={button({ variant: 'primary', size: 'sm' })}
            type="button"
            disabled={busy || uploading}
            onClick={() => {
              setModal(null);
              void save('draft');
            }}
          >
            Unpublish article
          </button>
        </div>
      </EditorDialog>
      <EditorDialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          previewTrigger.current?.focus();
        }}
        title="Reader preview"
        description="This is how your current content will appear to readers."
        wide
      >
        {preview && (
          <section aria-label="Article preview" className="preview-content">
            <h1>{preview.title || 'Untitled article'}</h1>
            <p>{preview.excerpt}</p>
            {preview.cover && <img className="cover" src={preview.cover} alt={preview.alt} />}
            <article
              className="sw-prose prose article-prose"
              dangerouslySetInnerHTML={{ __html: preview.html }}
            />
          </section>
        )}
      </EditorDialog>
    </>
  );
}
