import { Fragment, type ReactNode } from "react";

// Minimal, dependency-free, injection-safe markdown renderer for Cortex briefs:
// supports #/##/### headings, - / * bullet lists, and **bold** — builds React
// elements (no dangerouslySetInnerHTML).
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>
      : <Fragment key={i}>{p}</Fragment>,
  );
}

export function Markdown({ text }: { text: string }) {
  const lines = (text || "").split("\n");
  const out: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      out.push(
        <ul key={`ul-${out.length}`} className="my-2 list-disc space-y-1 ps-5">
          {list.map((li, i) => <li key={i}>{inline(li)}</li>)}
        </ul>,
      );
      list = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    if (line.startsWith("### ")) { flush(); out.push(<h4 key={out.length} className="mt-4 font-semibold text-foreground">{inline(line.slice(4))}</h4>); }
    else if (line.startsWith("## ")) { flush(); out.push(<h3 key={out.length} className="mt-5 text-base font-semibold text-foreground">{inline(line.slice(3))}</h3>); }
    else if (line.startsWith("# ")) { flush(); out.push(<h2 key={out.length} className="mt-5 text-lg font-bold text-foreground">{inline(line.slice(2))}</h2>); }
    else if (/^[-*]\s+/.test(line)) { list.push(line.replace(/^[-*]\s+/, "")); }
    else { flush(); out.push(<p key={out.length} className="mt-2 leading-relaxed">{inline(line)}</p>); }
  }
  flush();
  return <div className="text-sm text-muted-foreground">{out}</div>;
}
