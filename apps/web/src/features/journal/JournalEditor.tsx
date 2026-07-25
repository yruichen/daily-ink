import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered, Quote } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button";

type Props = {
  content: Record<string, unknown>;
  sourceId: string | null;
  onChange: (contentJson: Record<string, unknown>, contentText: string) => void;
};

export const JournalEditor = ({ content, sourceId, onChange }: Props) => {
  const { t } = useTranslation();
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: t("journal.placeholder") }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "writing-editor",
        spellcheck: "true",
        "aria-label": t("journal.placeholder"),
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(
        currentEditor.getJSON() as Record<string, unknown>,
        currentEditor.getText({ blockSeparator: "\n\n" }),
      );
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(content);
    if (current !== next) editor.commands.setContent(content);
  }, [content, editor]);

  if (!editor) return <div className="editor-loading" />;

  const controls = [
    {
      label: "Bold",
      icon: Bold,
      active: editor.isActive("bold"),
      action: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "Italic",
      icon: Italic,
      active: editor.isActive("italic"),
      action: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "Bullet list",
      icon: List,
      active: editor.isActive("bulletList"),
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Ordered list",
      icon: ListOrdered,
      active: editor.isActive("orderedList"),
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Quote",
      icon: Quote,
      active: editor.isActive("blockquote"),
      action: () => editor.chain().focus().toggleBlockquote().run(),
    },
  ];

  return (
    <div className="editor-surface">
      <div
        className="editor-toolbar"
        role="toolbar"
        aria-label="Text formatting"
      >
        {controls.map(({ label, icon: Icon, active, action }) => (
          <Button
            key={label}
            variant="ghost"
            className={active ? "is-active" : ""}
            icon={<Icon size={17} />}
            onMouseDown={(event) => {
              event.preventDefault();
              action();
            }}
            aria-label={label}
            title={label}
          />
        ))}
      </div>
      <div
        data-vocabulary-source="journal"
        data-source-id={sourceId ?? undefined}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
