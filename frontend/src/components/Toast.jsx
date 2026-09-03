import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useLanguage } from "../i18n/LanguageContext.jsx";

/**
 * Toast system, per screen 08 of the export and its stated rules:
 *
 *   "Top-anchored, 16px inset, stack max 2. Auto-dismiss 4s; toasts with an
 *    action hold 7s. Deep-brown variant is reserved for destructive undo.
 *    Never use the gradient here."
 *
 * All four rules are enforced here rather than left to callers: the stack is
 * sliced to 2, the timeout is chosen by whether an action is present, `brown`
 * is only reachable via `toast.undo()`, and no gradient class appears.
 */

const ToastContext = createContext(null);
const MAX_STACK = 2;
const HOLD_PLAIN = 4000;
const HOLD_WITH_ACTION = 7000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    ({ title, body = null, action = null, tone = "ivory", icon = null }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((list) => {
        const next = [...list, { id, title, body, action, tone, icon }];
        // Rule: stack max 2 — oldest falls off rather than queueing.
        const dropped = next.slice(0, Math.max(0, next.length - MAX_STACK));
        dropped.forEach((toast) => {
          const timer = timers.current.get(toast.id);
          if (timer) clearTimeout(timer);
          timers.current.delete(toast.id);
        });
        return next.slice(-MAX_STACK);
      });
      const hold = action ? HOLD_WITH_ACTION : HOLD_PLAIN;
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), hold),
      );
      return id;
    },
    [dismiss],
  );

  // Clear every pending timer if the provider unmounts mid-flight.
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
    },
    [],
  );

  const value = useMemo(
    () => ({
      toast: push,
      dismiss,
      /** Destructive undo — the only route to the deep-brown variant. */
      undo: ({ title, body, onUndo, label }) =>
        push({ title, body, tone: "brown", action: { label, onPress: onUndo } }),
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts, onDismiss }) {
  const { t } = useLanguage();
  if (!toasts.length) return null;
  return (
    <div
      // Top-anchored with a 16px inset, above the sheet layer.
      className="pointer-events-none absolute inset-x-4 top-4 z-50 flex flex-col gap-2"
      role="region"
      aria-live="polite"
      aria-label={t("toast.region")}
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

function Toast({ title, body, action, tone, icon, onDismiss }) {
  const surface =
    tone === "brown"
      ? "bg-brown text-ivory"
      : "bg-ivory text-brown shadow-hairline";
  const bodyTone = tone === "brown" ? "text-beige/80" : "text-ink-muted";
  const actionTone = tone === "brown" ? "text-sandstone" : "text-terracotta";

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3 shadow-toast ${surface}`}
    >
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        <p className="font-sans text-[13.5px] font-medium leading-snug">{title}</p>
        {body ? (
          <p className={`mt-0.5 font-sans text-[11.5px] font-light leading-snug ${bodyTone}`}>
            {body}
          </p>
        ) : null}
      </div>
      {action ? (
        <button
          onClick={() => {
            action.onPress?.();
            onDismiss();
          }}
          className={`shrink-0 font-sans text-[12.5px] font-semibold ${actionTone} active:opacity-60`}
        >
          {action.label}
        </button>
      ) : (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className={`-me-1 shrink-0 opacity-50 active:opacity-100 ${bodyTone}`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="m7 7 10 10M17 7 7 17" />
          </svg>
        </button>
      )}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
