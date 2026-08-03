import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Languages,
  LoaderCircle,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { Button } from "../components/ui/Button";

export const VocabularyPage = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const itemsQuery = useQuery({
    queryKey: ["vocabulary", query],
    queryFn: () => api.vocabulary(query),
  });
  const healthQuery = useQuery({ queryKey: ["health"], queryFn: api.health });

  const deleteMutation = useMutation({
    mutationFn: api.deleteVocabulary,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["vocabulary"] }),
        queryClient.invalidateQueries({ queryKey: ["reviews"] }),
      ]);
    },
  });

  const enrichMutation = useMutation({
    mutationFn: (id: string) =>
      api.enrichVocabulary(id, i18n.language === "zh-CN" ? "zh-CN" : "en"),
    onSuccess: ({ job }) => {
      const poll = window.setInterval(async () => {
        const result = await api.job(job.id);
        if (["completed", "failed", "cancelled"].includes(result.job.status)) {
          window.clearInterval(poll);
          setEnrichingId(null);
          await queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
        }
      }, 700);
    },
  });

  const items = itemsQuery.data?.items ?? [];
  return (
    <div className="standard-page">
      <header className="page-header">
        <div>
          <h1>{t("vocabulary.title")}</h1>
          <p>{t("vocabulary.subtitle")}</p>
        </div>
        <div className="library-count">
          <BookOpen size={18} />
          <strong>{items.length}</strong>
        </div>
      </header>

      <div className="search-field">
        <Search size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("vocabulary.search")}
          aria-label={t("vocabulary.search")}
        />
      </div>
      {itemsQuery.isLoading ? (
        <div className="loading-block">
          <LoaderCircle className="spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state page-empty">
          <Languages size={34} />
          <p>{t("vocabulary.empty")}</p>
        </div>
      ) : (
        <div className="vocabulary-grid">
          {items.map((item) => (
            <article className="vocabulary-item" key={item.id}>
              <header>
                <div>
                  <span className="type-label">
                    {t(`vocabulary.${item.kind}`)}
                  </span>
                  <h2>{item.term}</h2>
                </div>
                <Button
                  variant="ghost"
                  icon={<Trash2 size={17} />}
                  aria-label={t("common.delete")}
                  title={t("common.delete")}
                  onClick={() => {
                    if (window.confirm(t("vocabulary.deleteConfirm"))) {
                      deleteMutation.mutate(item.id);
                    }
                  }}
                />
              </header>
              {item.partOfSpeech ? (
                <span className="part-of-speech">{item.partOfSpeech}</span>
              ) : null}
              <p
                className={item.definition ? "definition" : "definition muted"}
              >
                {item.definition || t("vocabulary.definitionPlaceholder")}
              </p>
              {item.contextSentence ? (
                <blockquote>{item.contextSentence}</blockquote>
              ) : null}
              {item.collocations.length ? (
                <div className="tag-list">
                  {item.collocations.map((collocation) => (
                    <span key={collocation}>{collocation}</span>
                  ))}
                </div>
              ) : null}
              <footer>
                <span>
                  {t("vocabulary.sources", { count: item.sourceCount })}
                </span>
                <Button
                  variant="ghost"
                  icon={
                    enrichingId === item.id ? (
                      <LoaderCircle size={16} className="spin" />
                    ) : (
                      <Sparkles size={16} />
                    )
                  }
                  onClick={() => {
                    setEnrichingId(item.id);
                    enrichMutation.mutate(item.id);
                  }}
                  disabled={
                    !healthQuery.data?.providerConfigured ||
                    Boolean(enrichingId)
                  }
                >
                  {t("vocabulary.enrich")}
                </Button>
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
