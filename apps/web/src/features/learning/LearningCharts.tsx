import type { LearningReport } from "@ielts-diary/contracts";
import { useTranslation } from "react-i18next";

type ReportProps = {
  report: LearningReport;
};

const BarChart = ({
  points,
  remembered,
  label,
}: {
  points: Array<{ date: string; count: number }>;
  remembered?: number[];
  label: string;
}) => {
  const { i18n } = useTranslation();
  const maximum = Math.max(1, ...points.map(({ count }) => count));
  const dateFormatter = new Intl.DateTimeFormat(
    i18n.language === "zh-CN" ? "zh-CN" : "en",
    { month: "numeric", day: "numeric" },
  );
  return (
    <div className="learning-bar-chart" role="img" aria-label={label}>
      {points.map((point, index) => {
        const recall = remembered?.[index] ?? point.count;
        return (
          <div className="learning-bar-column" key={point.date}>
            <div className="learning-bar-track">
              <span
                className="learning-bar-total"
                style={{ height: `${(point.count / maximum) * 100}%` }}
              >
                {remembered ? (
                  <span
                    className="learning-bar-remembered"
                    style={{
                      height: `${point.count ? (recall / point.count) * 100 : 0}%`,
                    }}
                  />
                ) : null}
              </span>
            </div>
            <small>
              {index % Math.max(1, Math.ceil(points.length / 7)) === 0
                ? dateFormatter.format(new Date(`${point.date}T00:00:00`))
                : ""}
            </small>
            <span className="sr-only">{`${point.date}: ${point.count}`}</span>
          </div>
        );
      })}
    </div>
  );
};

export const ActivityChart = ({ report }: ReportProps) => {
  const { t } = useTranslation();
  return (
    <BarChart
      points={report.activity}
      remembered={report.activity.map(({ remembered }) => remembered)}
      label={t("learning.activityChartLabel")}
    />
  );
};

export const ForecastChart = ({ report }: ReportProps) => {
  const { t } = useTranslation();
  return (
    <BarChart
      points={report.forecast}
      label={t("learning.forecastChartLabel")}
    />
  );
};

export const ForgettingCurve = ({ report }: ReportProps) => {
  const { t } = useTranslation();
  if (!report.forgettingCurve.length) {
    return <p className="chart-empty">{t("learning.curveEmpty")}</p>;
  }
  const width = 640;
  const height = 220;
  const paddingX = 42;
  const paddingY = 22;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;
  const maxDay = Math.max(1, ...report.forgettingCurve.map(({ day }) => day));
  const points = report.forgettingCurve.map(({ day, retention }) => ({
    day,
    retention,
    x: paddingX + (day / maxDay) * plotWidth,
    y: paddingY + ((100 - retention) / 100) * plotHeight,
  }));

  return (
    <div className="forgetting-curve">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={t("learning.curveChartLabel")}
      >
        {[25, 50, 75, 100].map((retention) => {
          const y = paddingY + ((100 - retention) / 100) * plotHeight;
          return (
            <g key={retention}>
              <line x1={paddingX} x2={width - paddingX} y1={y} y2={y} />
              <text x={4} y={y + 4}>{`${retention}%`}</text>
            </g>
          );
        })}
        <polyline points={points.map(({ x, y }) => `${x},${y}`).join(" ")} />
        {points.map(({ day, retention, x, y }) => (
          <g key={day}>
            <circle cx={x} cy={y} r="4" />
            <text className="curve-day" x={x} y={height - 2}>
              {t("learning.dayShort", { day })}
            </text>
            <title>{`${t("learning.dayShort", { day })}: ${retention}%`}</title>
          </g>
        ))}
      </svg>
      <p>{t("learning.curveSample", { count: report.curveSampleSize })}</p>
    </div>
  );
};

export const RatingBreakdown = ({ report }: ReportProps) => {
  const { t } = useTranslation();
  const ratings = (["again", "hard", "good", "easy"] as const).map(
    (rating) => ({ rating, count: report.ratingCounts[rating] }),
  );
  const total = Math.max(
    1,
    ratings.reduce((sum, { count }) => sum + count, 0),
  );
  return (
    <div className="rating-breakdown">
      <div className="rating-distribution" aria-hidden="true">
        {ratings.map(({ rating, count }) => (
          <span
            key={rating}
            className={`rating-${rating}`}
            style={{ width: `${(count / total) * 100}%` }}
          />
        ))}
      </div>
      <ul>
        {ratings.map(({ rating, count }) => (
          <li key={rating}>
            <span className={`rating-dot rating-${rating}`} />
            <span>{t(`review.${rating}`)}</span>
            <strong>{count}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
};
