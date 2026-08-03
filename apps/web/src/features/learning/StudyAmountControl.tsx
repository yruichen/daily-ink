import { useEffect, useState } from "react";
import { Check, LoaderCircle, Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button";

type Props = {
  value: number;
  disabled?: boolean;
  saving?: boolean;
  onCommit: (value: number) => void;
};

const normalize = (value: number) =>
  Math.max(1, Math.min(100, Math.round(value)));

export const StudyAmountControl = ({
  value,
  disabled,
  saving,
  onCommit,
}: Props) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const commit = (candidate: number) => {
    const next = normalize(Number.isFinite(candidate) ? candidate : value);
    setDraft(String(next));
    if (next !== value) onCommit(next);
  };

  return (
    <div className="study-amount-control">
      <span>{t("wordbooks.studyAmount")}</span>
      <div>
        <Button
          variant="ghost"
          icon={<Minus size={15} />}
          aria-label={t("wordbooks.decreaseAmount")}
          disabled={disabled || saving || value <= 1}
          onClick={() => commit(value - 1)}
        />
        <label>
          <input
            type="number"
            min={1}
            max={100}
            inputMode="numeric"
            value={draft}
            disabled={disabled || saving}
            aria-label={t("wordbooks.studyAmount")}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => commit(Number(draft))}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
          <small>{t("wordbooks.wordsUnit")}</small>
        </label>
        <Button
          variant="ghost"
          icon={<Plus size={15} />}
          aria-label={t("wordbooks.increaseAmount")}
          disabled={disabled || saving || value >= 100}
          onClick={() => commit(value + 1)}
        />
      </div>
      <span className="study-amount-status" aria-live="polite">
        {saving ? (
          <LoaderCircle size={14} className="spin" />
        ) : (
          <Check size={14} />
        )}
        {saving ? t("common.saving") : t("common.saved")}
      </span>
    </div>
  );
};
