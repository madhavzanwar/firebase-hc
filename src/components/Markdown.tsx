import { Fragment, type ReactNode } from 'react';

/** Tiny, safe markdown subset renderer (headings, bullets, bold). No HTML injection. */
function inline(s: string): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul${blocks.length}`} className="ml-5 list-disc space-y-1">
          {list.map((li, i) => (
            <li key={i}>{inline(li)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const h = /^#{1,4}\s+(.*)$/.exec(line);
    const li = /^(?:[-*•]|\d+[.)])\s+(.*)$/.exec(line);
    if (h) {
      flush();
      blocks.push(<h3 key={`h${blocks.length}`} className="mt-3 font-bold text-slate-900">{inline(h[1]!)}</h3>);
    } else if (li) list.push(li[1]!);
    else {
      flush();
      blocks.push(<p key={`p${blocks.length}`}>{inline(line)}</p>);
    }
  }
  flush();
  return <div className="space-y-2 leading-relaxed text-slate-800">{blocks}</div>;
}
