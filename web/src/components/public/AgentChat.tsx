import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Bot, User } from "lucide-react";
import { useT } from "@togo-framework/ui";
import { chat, type ChatMessage } from "../../lib/public";
import { Markdown } from "./Markdown";

interface Props {
  // Exactly one of agent / entity sets the chat context.
  agent?: string;
  entity?: string;
  // Display name of who you're talking to (persona name or "AI analyst").
  speaker: string;
  // Quick-start prompts shown when the thread is empty.
  suggestions?: string[];
  // Override the outer wrapper classes (e.g. to embed inside a floating drawer).
  className?: string;
  // Hide the internal title bar (when a parent, e.g. ChatFab, provides its own).
  hideHeader?: boolean;
}

// AgentChat is a Cortex-backed chat widget. It posts the running thread plus the
// agent/entity context to POST /api/chat and renders the assistant reply as markdown.
export function AgentChat({ agent, entity, speaker, suggestions = [], className, hideHeader }: Props) {
  const { language } = useT();
  const ar = language === "ar";
  const tx = (en: string, a: string) => (ar ? a : en);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setError(null);
    const next: ChatMessage[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const reply = await chat(next, { agent, entity });
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : tx("Something went wrong.", "حدث خطأ ما."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={className ?? "surface-card mt-8 overflow-hidden rounded-2xl"}>
      {!hideHeader && (
        <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-semibold">
            {tx("Chat with", "تحدّث مع")} {speaker}
          </h2>
          <span className="ms-auto text-xs text-muted-foreground/60">AI</span>
        </div>
      )}

      <div ref={scrollRef} className="max-h-[420px] space-y-4 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              {tx(
                `Ask ${speaker} anything about the Saudi venture ecosystem.`,
                `اسأل ${speaker} أي شيء عن منظومة ريادة الأعمال السعودية.`,
              )}
            </p>
            {suggestions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                m.role === "user" ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
              }`}
            >
              {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </span>
            <div
              className={`min-w-0 max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground ring-1 ring-inset ring-border/60"
              }`}
            >
              {m.role === "user" ? <span className="whitespace-pre-wrap">{m.content}</span> : <Markdown text={m.content} />}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bot className="h-4 w-4 text-primary" />
            <span className="inline-flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
            </span>
          </div>
        )}
      </div>

      {error && <p className="px-5 pb-2 text-xs text-destructive">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 border-t border-border/60 px-4 py-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder={tx("Type your question…", "اكتب سؤالك…")}
          className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
          aria-label={tx("Send", "إرسال")}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}
