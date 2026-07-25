import {
  BookOpenText,
  Library,
  PenLine,
  RotateCcw,
  Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";

const navigation = [
  { to: "/", key: "today", icon: PenLine },
  { to: "/vocabulary", key: "vocabulary", icon: Library },
  { to: "/review", key: "review", icon: RotateCcw },
  { to: "/settings", key: "settings", icon: Settings },
] as const;

export const AppShell = () => {
  const { t } = useTranslation();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <BookOpenText size={22} strokeWidth={1.8} />
          </span>
          <div>
            <strong>{t("appName")}</strong>
            <small>{t("tagline")}</small>
          </div>
        </div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={key}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              <Icon size={19} />
              <span>{t(`nav.${key}`)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="privacy-dot" />
          <span>Local only</span>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.map(({ to, key, icon: Icon }) => (
          <NavLink
            key={key}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              isActive ? "mobile-nav-link active" : "mobile-nav-link"
            }
          >
            <Icon size={20} />
            <span>{t(`nav.${key}`)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
