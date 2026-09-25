import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { runCommand, COMMAND_NAMES, type Line, type CommandResult } from "../terminal/commands";

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
  /** Commands the shell handles rather than the registry. */
  onEffect: (effect: NonNullable<CommandResult["effect"]>) => void;
}

/** Shown before anyone types, so the page is readable without using the CLI. */
const BOOT: Line[] = [
  [{ t: "Hemosoo Woo", c: "text-text" }, { t: " — full-stack developer · CS @ Penn · 3× Amazon SDE intern", c: "text-subtle" }],
  [],
  [{ t: "This page is a shell. ", c: "text-subtle" }, { t: "help", c: "text-yellow" }, { t: " lists everything, or use the buttons below.", c: "text-subtle" }],
  [],
];

const QUICK = ["whoami", "work", "projects", "contact", "resume"];

export default function Terminal({ onEffect }: Props) {
  const reduced = useReducedMotion();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [booted, setBooted] = useState(false);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIndex, setHistIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  // Reveal the banner a line at a time; instant when motion is reduced.
  useEffect(() => {
    if (reduced) {
      setBlocks([{ id: nextId.current++, lines: BOOT }]);
      setBooted(true);
      return;
    }
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setBlocks([{ id: 0, lines: BOOT.slice(0, i) }]);
      if (i >= BOOT.length) {
        clearInterval(timer);
        nextId.current = 1;
        setBooted(true);
      }
    }, 110);
    return () => clearInterval(timer);
  }, [reduced]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: reduced ? "auto" : "smooth" });
  }, [blocks, reduced]);

  const submit = useCallback(
    (raw: string) => {
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
        setBlocks((b) => [...b, { id: nextId.current++, input: value, lines: result.lines }]);
      }
      if (result.effect) onEffect(result.effect);
    },
    [onEffect]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      submit(input);
      return;
    }
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

  const renderLine = (line: Line, i: number) => (
    <div key={i} className="whitespace-pre-wrap break-words">
      {line.length === 0 ? (
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
    </div>
  );

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onClick={(e) => {
        // Don't steal the click when someone is selecting text or following a link.
        if (window.getSelection()?.toString()) return;
        if ((e.target as HTMLElement).closest("a,button")) return;
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
          {blocks.map((block) => (
            <div key={block.id} className="pb-3">
              {block.input !== undefined && (
                <div className="break-words">
                  {PROMPT} <span className="text-text">{block.input}</span>
                </div>
              )}
              {block.lines.map(renderLine)}
            </div>
          ))}
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
