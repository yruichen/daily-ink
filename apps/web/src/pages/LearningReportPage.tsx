import { useQuery } from "@tanstack/react-query";
import {
  Brain,
  CalendarClock,
  Flame,
  Gauge,
  LoaderCircle,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { Button } from "../components/ui/Button";
import {
  ActivityChart,
  ForecastChart,
  ForgettingCurve,
  RatingBreakdown,
} from "../features/learning/LearningCharts";

export const LearningReportPage = () => {
  const { t } = useTranslation();
  const timezoneOffsetMinutes = new Date().getTimezoneOffset();
  const reportQuery = useQuery({
    queryKey: ["learning-report", timezoneOffsetMinutes],
    queryFn: () => api.learningReport(timezoneOffsetMinutes),
  });
  const report = reportQuery.data?.report;

  return (
    <div className="standard-page learning-report-page">
      <header className="page-header">
        <div>
          <h1>{t("learning.title")}</h1>
          <p>{t("learning.subtitle")}</p>
        </div>
        <Button
          variant="secondary"
          icon={
            <RefreshCw
              size={16}
              className={reportQuery.isFetching ? "spin" : ""}
            />
          }
          disabled={reportQuery.isFetching}
          onClick={() => reportQuery.refetch()}
        >
          {t("learning.refresh")}
        </Button>
      </header>

      {reportQuery.isLoading ? (
        <div className="loading-block">
          <LoaderCircle className="spin" />
        </div>
      ) : reportQuery.error ? (
        <p className="form-error">{reportQuery.error.message}</p>
      ) : report ? (
        <>
          <section
            className="learning-metrics"
            aria-label={t("learning.overview")}
          >
            <article>
              <span>
                <Brain size={19} />
              </span>
              <small>{t("learning.studiedWords")}</small>
              <strong>{report.summary.studiedVocabulary}</strong>
              <p>
                {t("learning.ofTotal", {
                  count: report.summary.totalVocabulary,
                })}
              </p>
            </article>
            <article>
              <span>
                <Gauge size={19} />
              </span>
              <small>{t("learning.retention")}</small>
              <strong>{report.summary.retentionRate30Days}%</strong>
              <p>{t("learning.last30Days")}</p>
            </article>
            <article>
              <span>
                <Flame size={19} />
              </span>
              <small>{t("learning.currentStreak")}</small>
              <strong>
                {t("learning.days", { count: report.summary.currentStreak })}
              </strong>
              <p>
                {t("learning.longestStreak", {
                  count: report.summary.longestStreak,
                })}
              </p>
            </article>
            <article>
              <span>
                <Trophy size={19} />
              </span>
              <small>{t("learning.masteredWords")}</small>
              <strong>{report.summary.masteredVocabulary}</strong>
              <p>{t("learning.masteredHint")}</p>
            </article>
          </section>

          <section className="learning-secondary-metrics">
            <span>
              {t("learning.todayReviews", {
                count: report.summary.reviewsToday,
              })}
            </span>
            <span>
              {t("learning.weekReviews", {
                count: report.summary.reviewsLast7Days,
              })}
            </span>
            <span>
              {t("learning.dueNow", { count: report.summary.dueNow })}
            </span>
          </section>

          <div className="learning-dashboard">
            <section className="report-panel activity-panel">
              <header>
                <div>
                  <h2>{t("learning.activity")}</h2>
                  <p>{t("learning.activityHint")}</p>
                </div>
                <CalendarClock size={19} />
              </header>
              <ActivityChart report={report} />
            </section>
            <section className="report-panel curve-panel">
              <header>
                <div>
                  <h2>{t("learning.curve")}</h2>
                  <p>{t("learning.curveHint")}</p>
                </div>
              </header>
              <ForgettingCurve report={report} />
            </section>
            <section className="report-panel forecast-panel">
              <header>
                <div>
                  <h2>{t("learning.forecast")}</h2>
                  <p>{t("learning.forecastHint")}</p>
                </div>
              </header>
              <ForecastChart report={report} />
            </section>
            <section className="report-panel rating-panel">
              <header>
                <div>
                  <h2>{t("learning.ratings")}</h2>
                  <p>{t("learning.ratingsHint")}</p>
                </div>
              </header>
              <RatingBreakdown report={report} />
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
};
