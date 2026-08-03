import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookMarked,
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Play,
  Plus,
  Search,
  Volume2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { api } from "../../api/client";
import { Button } from "../../components/ui/Button";

const PAGE_SIZE = 50;

const speak = (term: string) => {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(term);
  utterance.lang = "en-GB";
  window.speechSynthesis.speak(utterance);
};

type AddVariables = {
  wordbookId: string;
  entryIds?: string[];
  limit?: number;
  addingId?: string;
  startReview?: boolean;
};

type Props = {
  batchSize: number;
};

export const WordbookBrowser = ({ batchSize }: Props) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedWordbookId, setSelectedWordbookId] = useState<string | null>(
    null,
  );
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");

  const wordbooksQuery = useQuery({
    queryKey: ["wordbooks"],
    queryFn: api.wordbooks,
  });
  const wordbook = wordbooksQuery.data?.wordbooks.find(
    ({ id }) => id === selectedWordbookId,
  );
  const entriesQuery = useQuery({
    queryKey: ["wordbook-entries", selectedWordbookId, query, page],
    queryFn: () =>
      api.wordbookEntries(selectedWordbookId!, query, page, PAGE_SIZE),
    enabled: Boolean(selectedWordbookId),
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(queryInput), 250);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  useEffect(() => {
    setPage(1);
  }, [query, selectedWordbookId]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, query, selectedWordbookId]);

  const addMutation = useMutation({
    mutationFn: (variables: AddVariables) =>
      api.addWordbookEntries(variables.wordbookId, {
        locale: i18n.language === "zh-CN" ? "zh-CN" : "en",
        ...(variables.entryIds ? { entryIds: variables.entryIds } : {}),
        ...(variables.limit ? { limit: variables.limit } : {}),
      }),
    onSuccess: async (result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["wordbooks"] }),
        queryClient.invalidateQueries({ queryKey: ["wordbook-entries"] }),
        queryClient.invalidateQueries({ queryKey: ["vocabulary"] }),
        queryClient.invalidateQueries({ queryKey: ["reviews"] }),
        queryClient.invalidateQueries({ queryKey: ["health"] }),
      ]);
      setSelectedIds(new Set());
      setMessage(
        result.requestedCount
          ? t("wordbooks.addResult", { count: result.createdCount })
          : t("wordbooks.allAdded"),
      );
      if (variables.startReview && result.requestedCount) navigate("/review");
    },
  });

  const entries = entriesQuery.data?.items ?? [];
  const availableIds = useMemo(
    () => entries.filter(({ isAdded }) => !isAdded).map(({ id }) => id),
    [entries],
  );
  const allPageSelected =
    availableIds.length > 0 &&
    availableIds.every((entryId) => selectedIds.has(entryId));
  const totalPages = Math.max(
    1,
    Math.ceil((entriesQuery.data?.total ?? 0) / PAGE_SIZE),
  );
  const pendingWordbookId = addMutation.variables?.wordbookId;

  if (wordbooksQuery.isLoading) {
    return (
      <div className="loading-block">
        <LoaderCircle className="spin" />
      </div>
    );
  }

  if (wordbooksQuery.error) {
    return <p className="form-error">{wordbooksQuery.error.message}</p>;
  }

  if (!selectedWordbookId) {
    return (
      <div>
        {message ? <p className="inline-notice">{message}</p> : null}
        <div className="wordbook-grid">
          {(wordbooksQuery.data?.wordbooks ?? []).map((item) => {
            const percent = Math.round(
              (item.addedCount / Math.max(1, item.entryCount)) * 100,
            );
            const completed = item.addedCount >= item.entryCount;
            const pending =
              addMutation.isPending && pendingWordbookId === item.id;
            return (
              <article className="wordbook-card" key={item.id}>
                <span className="wordbook-icon">
                  <BookMarked size={21} />
                </span>
                <strong>{t(item.nameKey)}</strong>
                <p>{t(item.descriptionKey)}</p>
                <div className="wordbook-progress">
                  <span style={{ width: `${percent}%` }} />
                </div>
                <small>
                  {t("wordbooks.progress", {
                    added: item.addedCount,
                    total: item.entryCount,
                  })}
                </small>
                <div className="wordbook-card-actions">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedWordbookId(item.id);
                      setMessage("");
                    }}
                  >
                    {t("wordbooks.open")}
                  </Button>
                  <Button
                    variant="primary"
                    icon={
                      pending ? (
                        <LoaderCircle size={16} className="spin" />
                      ) : completed ? (
                        <Check size={16} />
                      ) : (
                        <Play size={16} />
                      )
                    }
                    disabled={completed || addMutation.isPending}
                    onClick={() =>
                      addMutation.mutate({
                        wordbookId: item.id,
                        limit: batchSize,
                        startReview: true,
                      })
                    }
                  >
                    {completed
                      ? t("wordbooks.completed")
                      : t("wordbooks.studyNext", {
                          count: batchSize,
                        })}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="wordbook-browser">
      <div className="wordbook-toolbar">
        <Button
          variant="ghost"
          icon={<ArrowLeft size={17} />}
          onClick={() => {
            setSelectedWordbookId(null);
            setQueryInput("");
            setQuery("");
            setMessage("");
          }}
        >
          {t("wordbooks.allWordbooks")}
        </Button>
        <div>
          <h2>{wordbook ? t(wordbook.nameKey) : ""}</h2>
          <p>{wordbook ? t(wordbook.descriptionKey) : ""}</p>
        </div>
      </div>

      <div className="wordbook-primary-actions">
        <Button
          variant="primary"
          icon={
            addMutation.isPending ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <Play size={16} />
            )
          }
          disabled={addMutation.isPending}
          onClick={() =>
            addMutation.mutate({
              wordbookId: selectedWordbookId,
              limit: batchSize,
              startReview: true,
            })
          }
        >
          {t("wordbooks.studyNext", { count: batchSize })}
        </Button>
        <span>{t("wordbooks.studyNextHint")}</span>
      </div>

      <div className="wordbook-list-controls">
        <div className="search-field">
          <Search size={18} />
          <input
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            placeholder={t("wordbooks.search")}
            aria-label={t("wordbooks.search")}
          />
        </div>
        <label className="select-page">
          <input
            type="checkbox"
            checked={allPageSelected}
            disabled={!availableIds.length}
            onChange={() =>
              setSelectedIds(
                allPageSelected ? new Set() : new Set(availableIds),
              )
            }
          />
          <span>{t("wordbooks.selectPage")}</span>
        </label>
        <Button
          disabled={!selectedIds.size || addMutation.isPending}
          onClick={() =>
            addMutation.mutate({
              wordbookId: selectedWordbookId,
              entryIds: [...selectedIds],
            })
          }
        >
          {t("wordbooks.addSelected", { count: selectedIds.size })}
        </Button>
      </div>

      {message ? <p className="inline-notice">{message}</p> : null}
      {addMutation.error ? (
        <p className="form-error">{addMutation.error.message}</p>
      ) : null}
      {entriesQuery.isLoading ? (
        <div className="loading-block">
          <LoaderCircle className="spin" />
        </div>
      ) : entriesQuery.error ? (
        <p className="form-error">{entriesQuery.error.message}</p>
      ) : entries.length === 0 ? (
        <div className="empty-state compact">
          <p>{t("wordbooks.noResults")}</p>
        </div>
      ) : (
        <div className="lexicon-list">
          {entries.map((entry) => {
            const definition =
              i18n.language === "zh-CN"
                ? entry.translationZh || entry.definitionEn
                : entry.definitionEn || entry.translationZh;
            const selected = selectedIds.has(entry.id);
            const adding =
              addMutation.isPending &&
              addMutation.variables?.addingId === entry.id;
            return (
              <article
                className={`lexicon-row ${selected ? "selected" : ""}`}
                key={entry.id}
              >
                <label className="entry-select">
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={entry.isAdded || addMutation.isPending}
                    aria-label={t("wordbooks.selectTerm", {
                      term: entry.term,
                    })}
                    onChange={() =>
                      setSelectedIds((current) => {
                        const next = new Set(current);
                        if (next.has(entry.id)) next.delete(entry.id);
                        else next.add(entry.id);
                        return next;
                      })
                    }
                  />
                </label>
                <div className="lexicon-term">
                  <div>
                    <h3>{entry.term}</h3>
                    {entry.phonetic ? <span>/{entry.phonetic}/</span> : null}
                  </div>
                  <button
                    type="button"
                    className="sound-button"
                    aria-label={t("wordbooks.pronounce", { term: entry.term })}
                    onClick={() => speak(entry.term)}
                  >
                    <Volume2 size={16} />
                  </button>
                </div>
                <p>{definition}</p>
                <div className="lexicon-meta">
                  {entry.partOfSpeech ? (
                    <span>{entry.partOfSpeech}</span>
                  ) : null}
                  {entry.level ? (
                    <span>
                      {t("wordbooks.awlLevel", { level: entry.level })}
                    </span>
                  ) : null}
                </div>
                <Button
                  variant={entry.isAdded ? "ghost" : "secondary"}
                  icon={
                    adding ? (
                      <LoaderCircle size={16} className="spin" />
                    ) : entry.isAdded ? (
                      <Check size={16} />
                    ) : (
                      <Plus size={16} />
                    )
                  }
                  disabled={entry.isAdded || addMutation.isPending}
                  onClick={() =>
                    addMutation.mutate({
                      wordbookId: selectedWordbookId,
                      entryIds: [entry.id],
                      addingId: entry.id,
                    })
                  }
                >
                  {entry.isAdded
                    ? t("wordbooks.added")
                    : t("wordbooks.addToLibrary")}
                </Button>
              </article>
            );
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="pagination" aria-label={t("wordbooks.pagination")}>
          <Button
            variant="ghost"
            icon={<ChevronLeft size={17} />}
            aria-label={t("wordbooks.previousPage")}
            disabled={page <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          />
          <span>{t("wordbooks.page", { page, total: totalPages })}</span>
          <Button
            variant="ghost"
            icon={<ChevronRight size={17} />}
            aria-label={t("wordbooks.nextPage")}
            disabled={page >= totalPages}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          />
        </nav>
      ) : null}
    </div>
  );
};
