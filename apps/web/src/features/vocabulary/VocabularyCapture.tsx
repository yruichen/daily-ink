import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BookPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../../api/client";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";

type SelectionDraft = {
  term: string;
  contextSentence: string;
  sourceType: "journal" | "rewrite";
  sourceId: string | null;
  left: number;
  top: number;
};

export const VocabularyCapture = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<SelectionDraft | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [definition, setDefinition] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    const capture = () => {
      const rangeSelection = window.getSelection();
      const term = rangeSelection?.toString().trim().replace(/\s+/g, " ") ?? "";
      if (!term || term.length > 120 || !rangeSelection?.rangeCount) {
        if (!dialogOpen) setSelection(null);
        return;
      }
      const anchor =
        rangeSelection.anchorNode instanceof Element
          ? rangeSelection.anchorNode
          : rangeSelection.anchorNode?.parentElement;
      const source = anchor?.closest<HTMLElement>("[data-vocabulary-source]");
      if (!source) return;
      const range = rangeSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const paragraph = anchor?.closest("p, li, blockquote");
      setSelection({
        term,
        contextSentence:
          paragraph?.textContent?.trim() ?? source.textContent?.trim() ?? "",
        sourceType:
          source.dataset.vocabularySource === "rewrite" ? "rewrite" : "journal",
        sourceId: source.dataset.sourceId ?? null,
        left: Math.min(
          window.innerWidth - 180,
          Math.max(12, rect.left + rect.width / 2 - 70),
        ),
        top: Math.max(12, rect.top - 46),
      });
    };
    document.addEventListener("mouseup", capture);
    return () => document.removeEventListener("mouseup", capture);
  }, [dialogOpen]);

  const addMutation = useMutation({
    mutationFn: () => {
      if (!selection) throw new Error("No selection");
      return api.addVocabulary({
        term: selection.term,
        kind: /\s/.test(selection.term) ? "phrase" : "word",
        definition,
        contextSentence: selection.contextSentence,
        sourceType: selection.sourceType,
        sourceId: selection.sourceId,
        tags: tags
          .split(/[,，]/)
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
      await queryClient.invalidateQueries({ queryKey: ["reviews"] });
      setDialogOpen(false);
      setSelection(null);
      setDefinition("");
      setTags("");
      window.getSelection()?.removeAllRanges();
    },
  });

  return (
    <>
      {selection && !dialogOpen ? (
        <Button
          className="selection-action"
          style={{ left: selection.left, top: selection.top }}
          variant="primary"
          icon={<BookPlus size={16} />}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setDialogOpen(true)}
        >
          {t("vocabulary.addSelection")}
        </Button>
      ) : null}
      <Modal
        open={dialogOpen}
        title={t("vocabulary.dialogTitle")}
        onClose={() => setDialogOpen(false)}
      >
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            addMutation.mutate();
          }}
        >
          <label>
            <span>{t("vocabulary.term")}</span>
            <input value={selection?.term ?? ""} readOnly />
          </label>
          <label>
            <span>{t("vocabulary.definition")}</span>
            <textarea
              rows={3}
              value={definition}
              onChange={(event) => setDefinition(event.target.value)}
              placeholder={t("vocabulary.definitionPlaceholder")}
            />
          </label>
          <label>
            <span>{t("vocabulary.tags")}</span>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder={t("vocabulary.tagsPlaceholder")}
            />
          </label>
          <div className="source-preview">
            <span>{t("vocabulary.source")}</span>
            <p>{selection?.contextSentence}</p>
          </div>
          {addMutation.error ? (
            <p className="form-error">{addMutation.error.message}</p>
          ) : null}
          <div className="modal-actions">
            <Button type="button" onClick={() => setDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={addMutation.isPending}
            >
              {t("common.add")}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
