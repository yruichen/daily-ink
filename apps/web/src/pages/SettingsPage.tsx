import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Cloud,
  Cpu,
  KeyRound,
  Languages,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type {
  ProviderProfile,
  ProviderProfileInput,
} from "@ielts-diary/contracts";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";

const presets = {
  openai: {
    name: "OpenAI",
    protocol: "openai" as const,
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1-mini",
    structured: true,
  },
  anthropic: {
    name: "Anthropic",
    protocol: "anthropic" as const,
    baseUrl: "https://api.anthropic.com",
    model: "claude-sonnet-4-5",
    structured: true,
  },
  ollama: {
    name: "Ollama",
    protocol: "openai" as const,
    baseUrl: "http://127.0.0.1:11434/v1",
    model: "qwen3:8b",
    structured: false,
  },
  lmstudio: {
    name: "LM Studio",
    protocol: "openai" as const,
    baseUrl: "http://127.0.0.1:1234/v1",
    model: "local-model",
    structured: false,
  },
  custom: {
    name: "Custom",
    protocol: "openai" as const,
    baseUrl: "http://127.0.0.1:8000/v1",
    model: "",
    structured: false,
  },
};

type PresetKey = keyof typeof presets;
type FormState = {
  name: string;
  protocol: "openai" | "anthropic";
  baseUrl: string;
  model: string;
  apiKey: string;
  supportsStructuredOutput: boolean;
  isDefault: boolean;
};

const emptyForm = (): FormState => ({
  name: presets.openai.name,
  protocol: presets.openai.protocol,
  baseUrl: presets.openai.baseUrl,
  model: presets.openai.model,
  apiKey: "",
  supportsStructuredOutput: true,
  isDefault: true,
});

export const SettingsPage = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProviderProfile | null>(null);
  const [preset, setPreset] = useState<PresetKey>("openai");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [testMessage, setTestMessage] = useState("");
  const profilesQuery = useQuery({
    queryKey: ["providers"],
    queryFn: api.providers,
  });

  useEffect(() => {
    if (!modalOpen) setTestMessage("");
  }, [modalOpen]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const input: ProviderProfileInput = {
        name: form.name,
        protocol: form.protocol,
        baseUrl: form.baseUrl,
        model: form.model,
        supportsStructuredOutput: form.supportsStructuredOutput,
        timeoutMs: 120_000,
        isDefault: form.isDefault,
        ...(form.apiKey ? { apiKey: form.apiKey } : {}),
      };
      return api.saveProvider(input, editing?.id);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["providers"] }),
        queryClient.invalidateQueries({ queryKey: ["health"] }),
      ]);
      setModalOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteProvider,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["providers"] }),
        queryClient.invalidateQueries({ queryKey: ["health"] }),
      ]);
    },
  });

  const testMutation = useMutation({
    mutationFn: api.testProvider,
    onSuccess: ({ model }) =>
      setTestMessage(t("settings.connectionOk", { model })),
    onError: (error) => setTestMessage(error.message),
  });

  const openNew = () => {
    setEditing(null);
    setPreset("openai");
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (profile: ProviderProfile) => {
    setEditing(profile);
    setPreset("custom");
    setForm({
      name: profile.name,
      protocol: profile.protocol,
      baseUrl: profile.baseUrl,
      model: profile.model,
      apiKey: "",
      supportsStructuredOutput: profile.supportsStructuredOutput,
      isDefault: profile.isDefault,
    });
    setModalOpen(true);
  };

  return (
    <div className="standard-page settings-page">
      <header className="page-header">
        <div>
          <h1>{t("settings.title")}</h1>
          <p>{t("settings.subtitle")}</p>
        </div>
        <Button variant="primary" icon={<Plus size={17} />} onClick={openNew}>
          {t("settings.newProfile")}
        </Button>
      </header>

      <section className="settings-section">
        <h2>{t("settings.profiles")}</h2>
        {profilesQuery.data?.profiles.length ? (
          <div className="provider-list">
            {profilesQuery.data.profiles.map((profile) => (
              <article className="provider-row" key={profile.id}>
                <button
                  className="provider-main"
                  onClick={() => openEdit(profile)}
                >
                  <span className="provider-icon">
                    {profile.baseUrl.includes("127.0.0.1") ||
                    profile.baseUrl.includes("localhost") ? (
                      <Cpu size={19} />
                    ) : (
                      <Cloud size={19} />
                    )}
                  </span>
                  <span>
                    <strong>{profile.name}</strong>
                    <small>
                      {profile.model} · {profile.protocol}
                    </small>
                  </span>
                </button>
                <div className="provider-actions">
                  {profile.isDefault ? (
                    <span className="default-label">Default</span>
                  ) : null}
                  <Button
                    variant="ghost"
                    icon={<CheckCircle2 size={17} />}
                    onClick={() => testMutation.mutate(profile.id)}
                    aria-label={t("common.test")}
                    title={t("common.test")}
                  />
                  <Button
                    variant="ghost"
                    icon={<Trash2 size={17} />}
                    onClick={() => deleteMutation.mutate(profile.id)}
                    aria-label={t("common.delete")}
                    title={t("common.delete")}
                  />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-settings">
            <KeyRound size={27} />
            <span>{t("settings.noProfiles")}</span>
          </div>
        )}
        {testMessage ? (
          <div className="inline-notice">{testMessage}</div>
        ) : null}
      </section>

      <section className="settings-section split-settings">
        <div>
          <span className="settings-icon">
            <Languages size={19} />
          </span>
          <div>
            <h2>{t("settings.language")}</h2>
            <p>{t("settings.automatic")}</p>
          </div>
        </div>
        <div className="segmented-control compact-control">
          <button
            className={i18n.language === "zh-CN" ? "active" : ""}
            onClick={() => void i18n.changeLanguage("zh-CN")}
          >
            简体中文
          </button>
          <button
            className={i18n.language === "en" ? "active" : ""}
            onClick={() => void i18n.changeLanguage("en")}
          >
            English
          </button>
        </div>
      </section>

      <section className="privacy-panel">
        <ShieldCheck size={22} />
        <div>
          <h2>{t("settings.privacy")}</h2>
          <p>{t("settings.privacyBody")}</p>
        </div>
      </section>

      <Modal
        open={modalOpen}
        title={editing ? t("settings.editProfile") : t("settings.newProfile")}
        onClose={() => setModalOpen(false)}
      >
        <form
          className="form-stack provider-form"
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate();
          }}
        >
          {!editing ? (
            <label>
              <span>{t("settings.providerPreset")}</span>
              <select
                value={preset}
                onChange={(event) => {
                  const key = event.target.value as PresetKey;
                  const selected = presets[key];
                  setPreset(key);
                  setForm((current) => ({
                    ...current,
                    name: selected.name,
                    protocol: selected.protocol,
                    baseUrl: selected.baseUrl,
                    model: selected.model,
                    supportsStructuredOutput: selected.structured,
                  }));
                }}
              >
                {Object.keys(presets).map((key) => (
                  <option value={key} key={key}>
                    {presets[key as PresetKey].name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="form-grid">
            <label>
              <span>{t("settings.name")}</span>
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </label>
            <label>
              <span>{t("settings.protocol")}</span>
              <select
                value={form.protocol}
                onChange={(event) =>
                  setForm({
                    ...form,
                    protocol: event.target.value as FormState["protocol"],
                  })
                }
              >
                <option value="openai">OpenAI compatible</option>
                <option value="anthropic">Anthropic compatible</option>
              </select>
            </label>
          </div>
          <label>
            <span>{t("settings.baseUrl")}</span>
            <input
              type="url"
              required
              value={form.baseUrl}
              onChange={(event) =>
                setForm({ ...form, baseUrl: event.target.value })
              }
            />
          </label>
          <label>
            <span>{t("settings.model")}</span>
            <input
              required
              value={form.model}
              onChange={(event) =>
                setForm({ ...form, model: event.target.value })
              }
            />
          </label>
          <label>
            <span>{t("settings.apiKey")}</span>
            <input
              type="password"
              value={form.apiKey}
              onChange={(event) =>
                setForm({ ...form, apiKey: event.target.value })
              }
              placeholder={editing?.hasApiKey ? t("settings.keyKeep") : ""}
              autoComplete="new-password"
            />
          </label>
          <div className="toggle-row">
            <label>
              <input
                type="checkbox"
                checked={form.supportsStructuredOutput}
                onChange={(event) =>
                  setForm({
                    ...form,
                    supportsStructuredOutput: event.target.checked,
                  })
                }
              />
              <span>{t("settings.structured")}</span>
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(event) =>
                  setForm({ ...form, isDefault: event.target.checked })
                }
              />
              <span>{t("settings.default")}</span>
            </label>
          </div>
          {saveMutation.error ? (
            <p className="form-error">{saveMutation.error.message}</p>
          ) : null}
          <div className="modal-actions">
            <Button type="button" onClick={() => setModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={saveMutation.isPending}
            >
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
