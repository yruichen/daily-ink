import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import zhCN from "./zh-CN.json";

const stored = localStorage.getItem("daily-ink-locale");
const detected = navigator.language.toLowerCase().startsWith("zh")
  ? "zh-CN"
  : "en";

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    "zh-CN": { translation: zhCN },
  },
  lng: stored ?? detected,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (language) => {
  localStorage.setItem("daily-ink-locale", language);
  document.documentElement.lang = language;
});

export default i18n;
