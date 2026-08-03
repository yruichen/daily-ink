import { BookMarked } from "lucide-react";
import { useTranslation } from "react-i18next";
import { WordbookBrowser } from "../features/vocabulary/WordbookBrowser";
import { StudyAmountControl } from "../features/learning/StudyAmountControl";
import { useLearningPreferences } from "../features/learning/useLearningPreferences";

export const WordbooksPage = () => {
  const { t } = useTranslation();
  const learning = useLearningPreferences();
  return (
    <div className="standard-page">
      <header className="page-header">
        <div>
          <h1>{t("wordbooks.title")}</h1>
          <p>{t("wordbooks.subtitle")}</p>
        </div>
        <div className="wordbook-header-actions">
          <StudyAmountControl
            value={learning.preferences.newWordsPerSession}
            disabled={learning.isLoading}
            saving={learning.isSaving}
            onCommit={(newWordsPerSession) =>
              learning.save({ newWordsPerSession })
            }
          />
          <div className="library-count">
            <BookMarked size={18} />
            <strong>{t("wordbooks.builtin")}</strong>
          </div>
        </div>
      </header>
      {learning.error ? (
        <p className="form-error">{learning.error.message}</p>
      ) : null}
      <WordbookBrowser batchSize={learning.preferences.newWordsPerSession} />
    </div>
  );
};
