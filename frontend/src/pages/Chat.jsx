import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { api } from "../api/client.js";
import { StatusBar, TopBar } from "../components/Shell.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

/**
 * Chat — screen 17. Terhal-branded header, terracotta outgoing bubbles, ivory
 * incoming bubbles on the beige ground, and suggestion chips before the first
 * message. The chat POST and transcript handling are carried over unchanged.
 */
const SUGGESTIONS = ["chat.s1", "chat.s2", "chat.s3"];

export default function Chat() {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState([]);
  // The camera guide sends you here with a question already typed, so the
  // "Ask about this place" button lands on something rather than a blank box.
  const { state } = useLocation();
  const [draft, setDraft] = useState(state?.draft ?? "");
  const [pending, setPending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  const ask = async (question) => {
    if (!question || pending) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setDraft("");
    setPending(true);
    try {
      const { answer } = await api.chat({ question, language });
      setMessages((m) => [...m, { role: "assistant", text: answer }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "error", text: err.message || t("common.error") }]);
    } finally {
      setPending(false);
    }
  };

  const send = (event) => {
    event.preventDefault();
    ask(draft.trim());
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-beige">
      <div className="bg-ivory">
        <StatusBar />
      </div>

      {/* The export gives Chat a branded header rather than a plain title. */}
      <div className="shrink-0 bg-ivory">
        <TopBar
          title={t("chat.name")}
          subtitle={t("chat.tagline")}
          showIcon
        />
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="space-y-3 py-6">
            <p className="text-center font-sans text-sm font-light leading-relaxed text-ink-muted">
              {t("chat.empty")}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((key) => (
                <button
                  key={key}
                  onClick={() => ask(t(key))}
                  className="rounded-full bg-ivory px-3.5 py-2 font-sans text-xs font-medium text-brown shadow-hairline active:bg-sandstone/30"
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message, i) => (
          <div
            key={i}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <p
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 font-sans text-sm font-light leading-relaxed ${
                message.role === "user"
                  ? "bg-terracotta text-ivory"
                  : message.role === "error"
                    ? "bg-brown text-ivory"
                    : "bg-ivory text-brown shadow-hairline"
              }`}
            >
              {message.text}
            </p>
          </div>
        ))}

        {pending ? (
          <p className="font-sans text-xs font-light text-ink-soft">{t("chat.thinking")}</p>
        ) : null}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={send}
        className="flex shrink-0 gap-2 border-t border-gray bg-ivory p-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("chat.placeholder")}
          className="min-w-0 flex-1 rounded-full bg-beige px-4 py-2.5 font-sans text-sm text-brown outline-none placeholder:text-ink-soft focus:ring-1 focus:ring-sandstone"
        />
        <button
          type="submit"
          disabled={pending || !draft.trim()}
          aria-label={t("chat.send")}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-terracotta text-ivory disabled:opacity-40"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 rtl:-scale-x-100"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h13M13 6.5 18.5 12 13 17.5" />
          </svg>
        </button>
      </form>
    </div>
  );
}
