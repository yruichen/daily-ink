import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, RotateCcw } from "lucide-react";
import type { ReviewRating } from "@ielts-diary/contracts";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { Button } from "../components/ui/Button";

export const ReviewPage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState("");
  const reviewsQuery = useQuery({
    queryKey: ["reviews"],
    queryFn: api.dueReviews,
  });
  const card = reviewsQuery.data?.cards[0];

  useEffect(() => {
    setRevealed(false);
    setAnswer("");
  }, [card?.id]);

  const rateMutation = useMutation({
    mutationFn: (rating: ReviewRating) => api.rateReview(card!.id, rating),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reviews"] });
      await queryClient.invalidateQueries({ queryKey: ["health"] });
    },
  });

  const total = reviewsQuery.data?.count ?? 0;
  return (
    <div className="standard-page review-page">
      <header className="page-header">
        <div>
          <h1>{t("review.title")}</h1>
          <p>{t("review.subtitle")}</p>
        </div>
        <div className="due-badge">
          <RotateCcw size={17} />
          {t("review.due", { count: total })}
        </div>
      </header>

      {!card ? (
        <div className="empty-state page-empty review-complete">
          <CheckCircle2 size={42} />
          <h2>{t("review.allDone")}</h2>
          <p>{t("review.allDoneBody")}</p>
        </div>
      ) : (
        <div className="review-stage">
          <div className="review-progress">
            <span
              style={{ width: `${Math.max(8, 100 / Math.max(1, total))}%` }}
            />
          </div>
          <article className="review-card" key={card.id}>
            <span className="review-kind">{t(`review.${card.cardType}`)}</span>
            {card.cardType === "recognition" ? (
              <h2>{card.prompt}</h2>
            ) : (
              <>
                <p className="cloze-prompt">{card.prompt}</p>
                <label className="answer-field">
                  <span>{t("review.yourAnswer")}</span>
                  <input
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder={t("review.answerPlaceholder")}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
              </>
            )}
            {!revealed ? (
              <Button
                className="reveal-button"
                variant="primary"
                icon={<Eye size={18} />}
                onClick={() => setRevealed(true)}
              >
                {t("review.showAnswer")}
              </Button>
            ) : (
              <div className="review-answer" aria-live="polite">
                {card.cardType === "production" ? (
                  <strong>{card.term}</strong>
                ) : null}
                <p>{card.definition || card.term}</p>
                {card.contextSentence ? (
                  <blockquote>
                    <span>{t("review.context")}</span>
                    {card.contextSentence}
                  </blockquote>
                ) : null}
              </div>
            )}
          </article>
          <div className={`rating-bar ${revealed ? "visible" : ""}`}>
            {(["again", "hard", "good", "easy"] as const).map((rating) => (
              <button
                key={rating}
                className={`rating-${rating}`}
                onClick={() => rateMutation.mutate(rating)}
                disabled={!revealed || rateMutation.isPending}
              >
                {t(`review.${rating}`)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
