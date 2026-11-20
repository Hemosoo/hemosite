/**
 * Everything below the hero: the player card at the left, the bio beside it,
 * then the experience and projects one glance below the bio, then contact.
 *
 * The bio is the Stretchtext engine (V1's copy, ./stretch.ts) running the
 * alternatives' bio (content/bio.ts). Opening a passage is handed to the air
 * mail courier once it has loaded, so passages arrive by paper plane. The
 * card is where the hero's plane lands (three/landing.ts).
 *
 * The index under the bio exists for the reader who won't open anything: the
 * three roles and two projects with their outcome in one line each. Every
 * row opens its passage in the bio, so the index is a way in, not a second
 * copy of the story.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import Card, { type CardHandle } from "./Card";
import { Stretch, type StretchState } from "./stretch";
import { landing } from "../../three/landing";
import { BIO } from "../../content/bio";
import { EARLIER, EXPERIENCE, PERSON, PROJECTS } from "../../content/profile";

export interface MainHandle {
  stretch: Stretch | null;
  contact: HTMLElement | null;
  about: HTMLElement | null;
}

interface Props {
  onState: (s: StretchState) => void;
  onPoker: () => void;
  bar: () => HTMLElement | null;
  depth: React.ReactNode;
}

const canFly = () => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
};

const Main = forwardRef<MainHandle, Props>(function Main({ onState, onPoker, bar, depth }, ref) {
  const layoutRef = useRef<HTMLDivElement>(null);
  const holdRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<CardHandle>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const bioRef = useRef<HTMLParagraphElement>(null);
  const marginRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLElement>(null);
  const stretchRef = useRef<Stretch | null>(null);
  const [hintGone, setHintGone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [coarse] = useState(() => window.matchMedia("(pointer: coarse)").matches);

  useImperativeHandle(ref, () => ({
    get stretch() {
      return stretchRef.current;
    },
    get contact() {
      return contactRef.current;
    },
    get about() {
      return sheetRef.current;
    },
  }));

  const cb = useRef({ onState, onPoker });
  cb.current = { onState, onPoker };

  useEffect(() => {
    const sheet = sheetRef.current;
    const bio = bioRef.current;
    const margin = marginRef.current;
    if (!sheet || !bio || !margin) return;
    const s = new Stretch({
      sheet,
      bio,
      margin,
      nodes: BIO,
      origin: () => cardRef.current?.card ?? null,
      onChange: (st) => cb.current.onState(st),
      onAction: (name) => {
        if (name === "poker") cb.current.onPoker();
      },
      onFirstUse: () => setHintGone(true),
      email: PERSON.email,
    });
    stretchRef.current = s;

    // The planes are a second WebGL context and a chunk of three.js: fetched
    // once the page is idle, and only where they can fly.
    let post: { dispose: () => void } | null = null;
    let cancelled = false;
    if (canFly()) {
      const load = () =>
        import("../../airmail/post").then(({ startPost }) => {
          if (cancelled) return;
          const p = startPost({ bar });
          if (!p) return;
          post = p;
          s.setCourier(p.send);
        });
      if ("requestIdleCallback" in window) window.requestIdleCallback(() => void load(), { timeout: 2500 });
      else setTimeout(() => void load(), 1200);
    }
    return () => {
      cancelled = true;
      post?.dispose();
      s.destroy();
      stretchRef.current = null;
    };
  }, [bar]);

  // Where the hero's plane lands.
  useEffect(() => {
    landing.slot = cardRef.current?.card ?? null;
    landing.hold = holdRef.current;
    landing.layout = layoutRef.current;
    landing.unflip = () => cardRef.current?.setFlipped(false);
    const measure = () => landing.measure();
    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => {
      window.removeEventListener("resize", measure);
      landing.slot = landing.hold = landing.layout = null;
      landing.unflip = null;
    };
  }, []);

  const onStat = useCallback((node: string, value: string, from: HTMLElement) => stretchRef.current?.go(node, value, from), []);
  const onLight = useCallback((node: string, value: string) => stretchRef.current?.light(node, value), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PERSON.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* the address is selectable as text */
    }
  };

  return (
    <section className="v1-main" aria-label="About Hemosoo">
      <div ref={layoutRef} className="v1-layout">
        <aside className="v1-cardcol" aria-label="Player card">
          <div ref={holdRef} className="v1-hold" data-card-slot>
            <Card ref={cardRef} onStat={onStat} onLight={onLight} />
            <p className="v1-cardhint">
              <b>{coarse ? "Tap" : "Click"} the card</b> to turn it over: the stats on the back each open their line in the
              bio.
            </p>
          </div>
        </aside>

        <div className="v1-bioarea">
          {depth}
          <div ref={sheetRef} className="st-sheet" id="about">
            <div ref={marginRef} className="st-margin" aria-hidden />
            <p ref={bioRef} className="st-bio" />
          </div>
          <p className={`v1-hint${hintGone ? " gone" : ""}`}>
            Every coloured phrase opens into more of the sentence. <kbd>+</kbd> and <kbd>−</kbd> open or close a whole
            level.
          </p>
        </div>

        <div className="v1-index">
          <section aria-labelledby="v1-exp" id="experience">
            <h2 className="v1-h" id="v1-exp">
              Experience <span className="n">2022 – 2026</span>
            </h2>
            <ol className="v1-rows">
              {EXPERIENCE.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="v1-row"
                    onClick={() => stretchRef.current?.reveal([r.id])}
                    aria-label={`${r.service}, ${r.org} ${r.team}, ${r.year}. Open in the bio`}
                  >
                    <span className="yr">{r.year}</span>
                    <span className="t">
                      {r.service}
                      <small>
                        {r.org} {r.team}
                      </small>
                    </span>
                    <span className="go" aria-hidden>
                      in the bio ↑
                    </span>
                    <span className="s">{r.summary}</span>
                    <span className="stk">{r.stack.join(" · ")}</span>
                  </button>
                </li>
              ))}
              <li>
                <div className="v1-row" style={{ ["--c" as string]: "var(--c-eng)" }}>
                  <span className="yr">{EARLIER.year}</span>
                  <span className="t">
                    {EARLIER.service}
                    <small>{EARLIER.org}</small>
                  </span>
                  <span className="s">
                    {EARLIER.summary} {EARLIER.bullets[2]}
                  </span>
                  <span className="stk">{EARLIER.stack.join(" · ")}</span>
                </div>
              </li>
            </ol>
          </section>

          <section aria-labelledby="v1-proj" id="projects">
            <h2 className="v1-h" id="v1-proj">
              Projects <span className="n">on GitHub</span>
            </h2>
            <ol className="v1-rows">
              {PROJECTS.map((p) => (
                <li key={p.id}>
                  <div className="v1-row v1-proj" style={{ ["--c" as string]: "var(--c-eng)" }}>
                    <span className="yr" aria-hidden />
                    <span className="t">
                      <a href={p.repo} target="_blank" rel="noreferrer">
                        {p.name}
                      </a>
                    </span>
                    <button type="button" className="go-b" onClick={() => stretchRef.current?.reveal([p.id])}>
                      in the bio ↑
                    </button>
                    <span className="s">{p.what}</span>
                    <ul className="dec">
                      {p.decisions.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                    <span className="stk">{p.stack.join(" · ")}</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <footer ref={contactRef} className="v1-foot" id="contact">
          <div className="v1-contact">
            <p className="lead">The fastest way to reach me is email.</p>
            <div className="row">
              <span className="mail">{PERSON.email}</span>
              <button type="button" className="copy" onClick={copy}>
                {copied ? "copied" : "copy"}
              </button>
            </div>
            <div className="row">
              <a href={PERSON.links.resume} target="_blank" rel="noreferrer">
                Résumé ↗
              </a>
              <a href={PERSON.links.github} target="_blank" rel="noreferrer">
                GitHub ↗
              </a>
              <a href={PERSON.links.linkedin} target="_blank" rel="noreferrer">
                LinkedIn ↗
              </a>
              <a href={PERSON.links.instagram} target="_blank" rel="noreferrer">
                Instagram ↗
              </a>
            </div>
          </div>
          <div className="v1-small">
            <span>Hemosoo Woo · hemosoo.com</span>
            <button
              type="button"
              onClick={() =>
                window.scrollTo({
                  top: 0,
                  behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                })
              }
            >
              Back to the top
            </button>
          </div>
        </footer>
      </div>
    </section>
  );
});

export default Main;
