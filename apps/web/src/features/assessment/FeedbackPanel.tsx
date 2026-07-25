import type { Assessment, Rewrite } from "@ielts-diary/contracts";
import { AlertCircle, ArrowRight, Check, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

const Dimension = ({
  label,
  score,
  summary,
}: {
  label: string;
  score: number;
  summary: string;
}) => (
  <div className="dimension-row">
    <div className="dimension-score">{score.toFixed(1)}</div>
    <div>
      <strong>{label}</strong>
      <p>{summary}</p>
    </div>
  </div>
);

export const AssessmentView = ({
  assessment,
  currentHash,
}: {
  assessment: Assessment;
  currentHash: string;
}) => {
  const { t } = useTranslation();
  const result = assessment.result;
  return (
    <div className="feedback-result">
      {assessment.snapshotHash !== currentHash ? (
        <div className="inline-notice warning">
          <AlertCircle size={16} />
          <span>{t("journal.outdated")}</span>
        </div>
      ) : null}
      <div className="score-hero">
        <div>
          <span>{t("journal.estimated")}</span>
          <strong>{result.overallScore.toFixed(1)}</strong>
        </div>
        <p>{t("journal.notOfficial")}</p>
      </div>
      <div className="dimension-list">
        <Dimension
          label="Content & Development"
          {...result.contentDevelopment}
        />
        <Dimension label="Coherence & Cohesion" {...result.coherenceCohesion} />
        <Dimension label="Lexical Resource" {...result.lexicalResource} />
        <Dimension
          label="Grammar Range & Accuracy"
          {...result.grammaticalRangeAccuracy}
        />
      </div>
      <section className="feedback-section">
        <h3>
          <Check size={17} />
          {t("journal.strengths")}
        </h3>
        <ul>
          {result.strengths.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="feedback-section">
        <h3>
          <ArrowRight size={17} />
          {t("journal.priorities")}
        </h3>
        <ul>
          {result.priorities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      {result.corrections.length ? (
        <section className="feedback-section">
          <h3>
            <Sparkles size={17} />
            {t("journal.corrections")}
          </h3>
          <div className="correction-list">
            {result.corrections.map((item, index) => (
              <div className="correction" key={`${item.original}-${index}`}>
                <del>{item.original}</del>
                <span>{item.corrected}</span>
                <p>{item.explanation}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <footer className="result-meta">
        {assessment.modelName} · prompt {assessment.promptVersion}
      </footer>
    </div>
  );
};

export const RewriteView = ({
  rewrite,
  currentHash,
}: {
  rewrite: Rewrite;
  currentHash: string;
}) => {
  const { t } = useTranslation();
  return (
    <div className="feedback-result">
      {rewrite.snapshotHash !== currentHash ? (
        <div className="inline-notice warning">
          <AlertCircle size={16} />
          <span>{t("journal.outdated")}</span>
        </div>
      ) : null}
      <article
        className="rewrite-copy"
        data-vocabulary-source="rewrite"
        data-source-id={rewrite.id}
      >
        {rewrite.result.rewrittenText.split("\n").map((paragraph, index) => (
          <p key={`${paragraph.slice(0, 20)}-${index}`}>{paragraph}</p>
        ))}
      </article>
      {rewrite.result.changes.length ? (
        <section className="feedback-section">
          <h3>{t("journal.changes")}</h3>
          <div className="change-list">
            {rewrite.result.changes.map((change, index) => (
              <div className="change-row" key={`${change.original}-${index}`}>
                <div>
                  <del>{change.original}</del>
                  <ArrowRight size={15} />
                  <strong>{change.revised}</strong>
                </div>
                <p>{change.reason}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      {rewrite.result.notes.length ? (
        <section className="feedback-section">
          <h3>{t("journal.notes")}</h3>
          <ul>
            {rewrite.result.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <footer className="result-meta">
        {rewrite.modelName} · prompt {rewrite.promptVersion}
      </footer>
    </div>
  );
};
