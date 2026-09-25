import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import {
  runCommand,
  COMMAND_NAMES,
  type Line,
  type Span,
  type CommandResult,
} from "../terminal/commands";

const PROMPT = (
  <>
    <span className="text-green">hemosoo</span>
    <span className="text-dim">@</span>
    <span className="text-cyan">penn</span>
    <span className="text-dim">:~$</span>
  </>
);

interface Block {
  id: number;
  input?: string;
  lines: Line[];
}

interface Props {
  onEffect: (effect: NonNullable<CommandResult["effect"]>) => void;
}

const BOOT: Line[] = [
  [{ t: "Hemosoo Woo", c: "text-text" }, { t: " — full-stack developer · CS @ Penn · 3× Amazon SDE intern", c: "text-subtle" }],
  [],
  [{ t: "This page is a shell. ", c: "text-subtle" }, { t: "help", c: "text-yellow" }, { t: " lists everything, or use the buttons below.", c: "text-subtle" }],
  [],
];

const QUICK = ["whoami", "work", "projects", "contact", "resume"];

/** Characters per second, and the ceiling on how long any one block may take.
 *  Long output speeds up rather than dragging — nobody waits out a `help`. */
const CPS = 900;
const MAX_MS = 900;
const MIN_MS = 140;

const lineChars = (line: Line) => line.reduce((n, s) => n + s.t.length, 0);
/** +1 per line for its newline, so blank lines still take a beat. */
const countChars = (lines: Line[]) => lines.reduce((n, l) => n + lineChars(l) + 1, 0);

/** The first `n` characters of a block, keeping each span's colour. */
function sliceLines(lines: Line[], n: number): Line[] {
  const out: Line[] = [];
  let left = n;
  for (const line of lines) {
    if (left <= 0) break;
    const spans: Span[] = [];
    for (const span of line) {
      if (left <= 0) break;
      if (span.t.length <= left) {
        spans.push(span);
        left -= span.t.length;
      } else {
        spans.push({ ...span, t: span.t.slice(0, left) });
        left = 0;
      }
    }
    out.push(spans);
    left -= 1;
  }
  return out;
}

export default function Terminal({ onEffect }: Props) {
  const reduced = useReducedMotion();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [pending, setPending] = useState<Block | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [booted, setBooted] = useState(false);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIndex, setHistIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const pendingRef = useRef<Block | null>(null);
  pendingRef.current = pending;

  /** Drop the animation and show the whole block now. */
  const finishPending = useCallback(() => {
    const block = pendingRef.current;
    if (!block) return;
    setBlocks((b) => [...b, block]);
    setPending(null);
    setRevealed(0);
    setBooted(true);
  }, []);

  const emit = useCallback(
    (block: Block, instant: boolean) => {
      if (instant || block.lines.length === 0) {
        setBlocks((b) => [...b, block]);
        setBooted(true);
        return;
      }
      setPending(block);
      setRevealed(0);
    },
    []
  );

  // useReducedMotion resolves null -> boolean, so this effect can run twice;
  // without the latch the banner prints itself a second time.
  const bootOnce = useRef(false);
  useEffect(() => {
    if (bootOnce.current) return;
    bootOnce.current = true;
    emit({ id: 0, lines: BOOT }, !!reduced);
  }, [reduced, emit]);

  // Character reveal. Duration scales with length but stays inside MAX_MS.
  useEffect(() => {
    if (!pending) return;
    const total = countChars(pending.lines);
    const duration = Math.min(MAX_MS, Math.max(MIN_MS, (total / CPS) * 1000));
    let raf = 0;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const n = Math.floor(((ts - start) / duration) * total);
      if (n >= total) {
        finishPending();
        return;
      }
      setRevealed(n);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [pending, finishPending]);

  // Stick to the bottom. Never smooth mid-animation — that fights the reveal.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
  }, [blocks, revealed]);

  const submit = useCallback(
    (raw: string) => {
      finishPending();
      const value = raw.trim();
      setInput("");
      setHistIndex(-1);
      if (!value) {
        setBlocks((b) => [...b, { id: nextId.current++, input: "", lines: [] }]);
        return;
      }
      setHistory((h) => (h[h.length - 1] === value ? h : [...h, value]));
      const result = runCommand(value);
      if (result.clear) {
        setBlocks([]);
      } else {
        // The echo is what they just typed, so it appears at once; only the
        // machine's answer types itself out.
        setBlocks((b) => [...b, { id: nextId.current++, input: value, lines: [] }]);
        emit({ id: nextId.current++, lines: result.lines }, !!reduced);
      }
      if (result.effect) onEffect(result.effect);
    },
    [onEffect, reduced, emit, finishPending]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      submit(input);
      return;
    }
    if (pendingRef.current && e.key.length === 1) finishPending();
    if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setBlocks([]);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!history.length) return;
      const next = histIndex < 0 ? history.length - 1 : Math.max(0, histIndex - 1);
      setHistIndex(next);
      setInput(history[next]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIndex < 0) return;
      const next = histIndex + 1;
      if (next >= history.length) {
        setHistIndex(-1);
        setInput("");
      } else {
        setHistIndex(next);
        setInput(history[next]);
      }
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const [head, ...rest] = input.split(/\s+/);
      if (rest.length) return;
      const matches = COMMAND_NAMES.filter((n) => n.startsWith(head.toLowerCase()));
      if (matches.length === 1) setInput(matches[0] + " ");
      else if (matches.length > 1) {
        setBlocks((b) => [
          ...b,
          { id: nextId.current++, input, lines: [matches.map((m) => ({ t: m + "  ", c: "text-cyan" }))] },
        ]);
      }
    }
  };

  const renderLine = (line: Line, i: number, cursor = false) => (
    <div key={i} className="whitespace-pre-wrap break-words">
      {line.length === 0 && !cursor ? (
        " "
      ) : (
        line.map((span, j) =>
          span.href ? (
            <a
              key={j}
              href={span.href}
              target={span.href.startsWith("mailto:") ? undefined : "_blank"}
              rel="noreferrer"
              className={`${span.c ?? ""} underline decoration-dotted underline-offset-4 hover:text-accent`}
            >
              {span.t}
            </a>
          ) : (
            <span key={j} className={span.c}>
              {span.t}
            </span>
          )
        )
      )}
      {cursor && <span className="ml-px inline-block h-[1em] w-[0.55em] translate-y-[0.15em] bg-primary" />}
    </div>
  );

  const renderBlock = (block: Block, lines: Line[], typing = false) => (
    <div key={block.id} className="pb-3">
      {block.input !== undefined && (
        <div className="break-words">
          {PROMPT} <span className="text-text">{block.input}</span>
        </div>
      )}
      {lines.map((l, i) => renderLine(l, i, typing && i === lines.length - 1))}
    </div>
  );

  const pendingLines = pending ? sliceLines(pending.lines, revealed) : [];

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onClick={(e) => {
        if (window.getSelection()?.toString()) return;
        if ((e.target as HTMLElement).closest("a,button")) return;
        finishPending();
        inputRef.current?.focus();
      }}
    >
      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8"
        role="log"
        aria-live="polite"
        aria-label="Terminal output"
      >
        <div className="mx-auto max-w-3xl text-[13.5px] leading-[1.7] sm:text-sm">
          {blocks.map((b) => renderBlock(b, b.lines))}
          {pending && renderBlock(pending, pendingLines, true)}
          <div ref={endRef} />
        </div>
      </div>

      <div className="border-t border-line bg-surface/40 px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          <label className="flex items-center gap-2 text-[13.5px] sm:text-sm">
            <span className="flex-shrink-0">{PROMPT}</span>
            <span className="sr-only">Enter a command</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={!booted}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder={booted ? "type a command, or help" : ""}
              className="min-w-0 flex-1 bg-transparent text-text caret-primary outline-none placeholder:text-dim"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {QUICK.map((c) => (
              <button
                key={c}
                onClick={() => submit(c)}
                className="rounded border border-line px-2.5 py-1 text-xs text-subtle transition-colors hover:border-primary/60 hover:text-primary"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
