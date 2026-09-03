import { useEffect, useRef, useState } from "react";

import { api } from "../api/client.js";
import { TopBar } from "../components/Shell.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function Chat() {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  const send = async (event) => {
    event.preventDefault();
    const question = draft.trim();
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar title={t("chat.title")} />

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm leading-relaxed text-sand-500">
            {t("chat.empty")}
          </p>
        ) : null}

        {messages.map((message, i) => (
          <div
            key={i}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <p
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                message.role === "user"
                  ? "bg-rose-500 text-white"
                  : message.role === "error"
                    ? "bg-rose-50 text-rose-700"
                    : "bg-white text-sand-800 ring-1 ring-sand-200"
              }`}
            >
              {message.text}
            </p>
          </div>
        ))}

        {pending ? (
          <p className="text-xs text-sand-400">{t("chat.thinking")}</p>
        ) : null}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex shrink-0 gap-2 border-t border-sand-200 bg-white p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("chat.placeholder")}
          className="min-w-0 flex-1 rounded-full border border-sand-300 px-4 py-2.5 text-sm outline-none focus:border-rose-400"
        />
        <button
          type="submit"
          disabled={pending || !draft.trim()}
          className="shrink-0 rounded-full bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {t("chat.send")}
        </button>
      </form>
    </div>
  );
}
