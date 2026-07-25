import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Button } from "../components/ui/Button";
import {
  AssessmentView,
  RewriteView,
} from "../features/assessment/FeedbackPanel";
import { JournalEditor } from "../features/journal/JournalEditor";

const localDate = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const emptyDocument: Record<string, unknown> = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export const JournalPage = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(localDate());
  const [title, setTitle] = useState("");
  const [contentJson, setContentJson] =
    useState<Record<string, unknown>>(emptyDocument);
  const [contentText, setContentText] = useState("");
  const [dirty, setDirty] = useState(false);
  const [activePanel, setActivePanel] = useState<"assessment" | "rewrite">(
    "assessment",
  );
  const [rewriteMode, setRewriteMode] = useState<"natural" | "target-band">(
    "natural",
  );
  const [targetBand, setTargetBand] = useState(7);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const hydrationKey = useRef("");

  const entryQuery = useQuery({
    queryKey: ["journal", date],
    queryFn: () => api.journal(date),
  });
  const historyQuery = useQuery({
    queryKey: ["journals"],
    queryFn: api.journals,
  });
  const healthQuery = useQuery({ queryKey: ["health"], queryFn: api.health });
  const entry = entryQuery.data?.entry ?? null;

  useEffect(() => {
    if (!entryQuery.isSuccess) return;
    const key = `${date}:${entry?.updatedAt ?? "empty"}`;
    if (hydrationKey.current === key) return;
    hydrationKey.current = key;
    setTitle(entry?.title ?? "");
    setContentJson(entry?.contentJson ?? emptyDocument);
    setContentText(entry?.contentText ?? "");
    setDirty(false);
  }, [date, entry, entryQuery.isSuccess]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.saveJournal(date, { title, contentJson, contentText }),
    onSuccess: async ({ entry: saved }) => {
      hydrationKey.current = `${date}:${saved.updatedAt}`;
      setDirty(false);
      await Promise.all([
        queryClient.setQueryData(["journal", date], { entry: saved }),
        queryClient.invalidateQueries({ queryKey: ["journals"] }),
      ]);
    },
  });

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => saveMutation.mutate(), 750);
    return () => window.clearTimeout(timer);
  }, [contentJson, contentText, dirty, title]);

  const assessmentsQuery = useQuery({
    queryKey: ["assessments", entry?.id],
    queryFn: () => api.assessments(entry!.id),
    enabled: Boolean(entry),
  });
  const rewritesQuery = useQuery({
    queryKey: ["rewrites", entry?.id],
    queryFn: () => api.rewrites(entry!.id),
    enabled: Boolean(entry),
  });
  const jobQuery = useQuery({
    queryKey: ["job", activeJobId],
    queryFn: () => api.job(activeJobId!),
    enabled: Boolean(activeJobId),
    refetchInterval: (query) => {
      const status = query.state.data?.job.status;
      return status && ["completed", "failed", "cancelled"].includes(status)
        ? false
        : 700;
    },
  });

  useEffect(() => {
    const status = jobQuery.data?.job.status;
    if (status !== "completed") return;
    void queryClient.invalidateQueries({
      queryKey: ["assessments", entry?.id],
    });
    void queryClient.invalidateQueries({ queryKey: ["rewrites", entry?.id] });
    setActiveJobId(null);
  }, [entry?.id, jobQuery.data?.job.status, queryClient]);

  const createEntryBeforeAi = async () => {
    if (dirty || !entry) {
      const saved = await saveMutation.mutateAsync();
      return saved.entry;
    }
    return entry;
  };

  const assessmentMutation = useMutation({
    mutationFn: async () => {
      const savedEntry = await createEntryBeforeAi();
      return api.startAssessment({
        journalId: savedEntry.id,
        locale: i18n.language === "zh-CN" ? "zh-CN" : "en",
      });
    },
    onSuccess: ({ job }) => setActiveJobId(job.id),
  });

  const rewriteMutation = useMutation({
    mutationFn: async () => {
      const savedEntry = await createEntryBeforeAi();
      return api.startRewrite({
        journalId: savedEntry.id,
        locale: i18n.language === "zh-CN" ? "zh-CN" : "en",
        mode: rewriteMode,
        targetBand: rewriteMode === "target-band" ? targetBand : null,
      });
    },
    onSuccess: ({ job }) => setActiveJobId(job.id),
  });

  const wordCount = useMemo(
    () => (contentText.trim() ? contentText.trim().split(/\s+/).length : 0),
    [contentText],
  );
  const latestAssessment = assessmentsQuery.data?.assessments[0];
  const latestRewrite = rewritesQuery.data?.rewrites[0];
  const aiBusy =
    Boolean(activeJobId) ||
    assessmentMutation.isPending ||
    rewriteMutation.isPending;
  const jobError =
    jobQuery.data?.job.status === "failed" ? jobQuery.data.job.error : null;

  const moveDate = (days: number) => {
    const next = new Date(`${date}T12:00:00`);
    next.setDate(next.getDate() + days);
    setDate(localDate(next));
    hydrationKey.current = "";
  };

  return (
    <div className="journal-page">
      <header className="page-header journal-header">
        <div>
          <span className="eyebrow">{t("journal.eyebrow")}</span>
          <h1>{t("journal.title")}</h1>
          <p>{t("journal.subtitle")}</p>
        </div>
        <div className="date-stepper">
          <Button
            variant="ghost"
            icon={<ChevronLeft size={18} />}
            onClick={() => moveDate(-1)}
            aria-label="Previous day"
            title="Previous day"
          />
          <label>
            <CalendarDays size={17} />
            <input
              type="date"
              value={date}
              max={localDate()}
              onChange={(event) => {
                setDate(event.target.value);
                hydrationKey.current = "";
              }}
            />
          </label>
          <Button
            variant="ghost"
            icon={<ChevronRight size={18} />}
            onClick={() => moveDate(1)}
            disabled={date >= localDate()}
            aria-label="Next day"
            title="Next day"
          />
        </div>
      </header>

      <div className="journal-workspace">
        <section className="writing-pane">
          <div className="entry-heading">
            <input
              className="entry-title"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setDirty(true);
              }}
              placeholder={t("journal.titlePlaceholder")}
              aria-label={t("journal.entryTitle")}
              maxLength={160}
            />
            <div className="save-status" aria-live="polite">
              {saveMutation.isPending ? (
                <>
                  <LoaderCircle size={14} className="spin" />
                  {t("common.saving")}
                </>
              ) : (
                <>
                  <Check size={14} />
                  {t("common.saved")}
                </>
              )}
            </div>
          </div>
          <JournalEditor
            content={contentJson}
            sourceId={entry?.id ?? null}
            onChange={(json, text) => {
              setContentJson(json);
              setContentText(text);
              setDirty(true);
            }}
          />
          <footer className="editor-footer">
            <span>{t("journal.words", { count: wordCount })}</span>
            <div>
              <Button
                icon={<Sparkles size={17} />}
                onClick={() => {
                  setActivePanel("assessment");
                  assessmentMutation.mutate();
                }}
                disabled={aiBusy || contentText.trim().length < 10}
              >
                {t("journal.assess")}
              </Button>
              <Button
                variant="primary"
                icon={<WandSparkles size={17} />}
                onClick={() => {
                  setActivePanel("rewrite");
                  rewriteMutation.mutate();
                }}
                disabled={aiBusy || contentText.trim().length < 10}
              >
                {t("journal.rewrite")}
              </Button>
            </div>
          </footer>
        </section>

        <aside className="feedback-pane">
          <div className="segmented-control">
            <button
              className={activePanel === "assessment" ? "active" : ""}
              onClick={() => setActivePanel("assessment")}
            >
              {t("journal.feedback")}
            </button>
            <button
              className={activePanel === "rewrite" ? "active" : ""}
              onClick={() => setActivePanel("rewrite")}
            >
              {t("journal.rewriteTab")}
            </button>
          </div>

          {activePanel === "rewrite" ? (
            <div className="rewrite-controls">
              <select
                value={rewriteMode}
                onChange={(event) =>
                  setRewriteMode(
                    event.target.value as "natural" | "target-band",
                  )
                }
              >
                <option value="natural">{t("journal.natural")}</option>
                <option value="target-band">{t("journal.targetBand")}</option>
              </select>
              {rewriteMode === "target-band" ? (
                <select
                  value={targetBand}
                  onChange={(event) =>
                    setTargetBand(Number(event.target.value))
                  }
                >
                  {[5.5, 6, 6.5, 7, 7.5, 8, 8.5].map((band) => (
                    <option value={band} key={band}>
                      Band {band}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          ) : null}

          {!healthQuery.data?.providerConfigured ? (
            <div className="empty-state compact">
              <Sparkles size={28} />
              <p>{t("journal.noModel")}</p>
              <Link className="text-link" to="/settings">
                {t("common.configure")}
              </Link>
            </div>
          ) : aiBusy ? (
            <div className="model-working" aria-live="polite">
              <div className="working-orbit">
                <Sparkles size={20} />
              </div>
              <p>{t("journal.jobRunning")}</p>
            </div>
          ) : jobError ? (
            <div className="inline-notice error">
              {t("journal.jobFailed", { error: jobError })}
            </div>
          ) : activePanel === "assessment" && latestAssessment ? (
            <AssessmentView
              assessment={latestAssessment}
              currentHash={entry?.contentHash ?? ""}
            />
          ) : activePanel === "rewrite" && latestRewrite ? (
            <RewriteView
              rewrite={latestRewrite}
              currentHash={entry?.contentHash ?? ""}
            />
          ) : (
            <div className="empty-state">
              {activePanel === "assessment" ? (
                <Sparkles size={30} />
              ) : (
                <WandSparkles size={30} />
              )}
              <p>
                {activePanel === "assessment"
                  ? t("journal.emptyFeedback")
                  : t("journal.emptyRewrite")}
              </p>
            </div>
          )}
        </aside>
      </div>

      <section className="history-strip">
        <h2>{t("journal.history")}</h2>
        <div className="history-list">
          {historyQuery.data?.entries.slice(0, 7).map((item) => (
            <button
              key={item.id}
              className={item.entryDate === date ? "active" : ""}
              onClick={() => {
                setDate(item.entryDate);
                hydrationKey.current = "";
              }}
            >
              <time>
                {new Intl.DateTimeFormat(i18n.language, {
                  month: "short",
                  day: "numeric",
                }).format(new Date(`${item.entryDate}T12:00:00`))}
              </time>
              <span>
                {item.title || item.contentText.slice(0, 48) || "Untitled"}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
