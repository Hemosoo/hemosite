/**
 * /compare: the four versions of the site side by side. Not part of any of
 * them: a working page for choosing, with screenshots by default and a live
 * preview only when asked for (four WebGL pages at once would be unkind).
 */
import { useEffect, useRef, useState } from "react";
import { CRITERIA, SCORES, VERSIONS, type Version } from "./versions";

const shot = (id: string, kind: "desktop" | "mobile") => `${import.meta.env.BASE_URL}compare/${id}-${kind}.png`;

/** A live page, drawn at desktop width and scaled down to fit its column. */
function Live({ v }: { v: Version }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 1440));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="cp-live" style={{ height: 900 * scale }}>
      <iframe
        title={`${v.name}, live`}
        src={v.href}
        style={{ transform: `scale(${scale})` }}
        loading="lazy"
      />
    </div>
  );
}

function Entry({ v, n }: { v: Version; n: number }) {
  const [live, setLive] = useState(false);
  return (
    <article className="cp-entry" id={v.id}>
      <header className="cp-head">
        <span className="cp-n">{n === 0 ? "now" : `0${n}`}</span>
        <h2>{v.name}</h2>
        <a className="cp-route" href={v.href}>
          {v.href}
        </a>
      </header>

      <div className="cp-shots">
        {live ? (
          <Live v={v} />
        ) : (
          <img className="cp-desk" src={shot(v.id, "desktop")} alt={`${v.name}, first screen at 1440 pixels wide`} loading="lazy" />
        )}
        <img className="cp-phone" src={shot(v.id, "mobile")} alt={`${v.name} on a phone`} loading="lazy" />
      </div>

      <p className="cp-dir">{v.direction}</p>

      <dl className="cp-trade">
        <div>
          <dt>Gains</dt>
          {v.gains.map((g) => (
            <dd key={g}>{g}</dd>
          ))}
        </div>
        <div>
          <dt>Costs</dt>
          {v.costs.map((c) => (
            <dd key={c}>{c}</dd>
          ))}
        </div>
      </dl>
      <p className="cp-aud">
        <span>For</span> {v.audience}
      </p>

      <div className="cp-actions">
        <a className="cp-open" href={v.href}>
          Open {v.name}
        </a>
        <button type="button" onClick={() => setLive((l) => !l)} aria-pressed={live}>
          {live ? "Show the screenshot" : "Live preview here"}
        </button>
      </div>
    </article>
  );
}

export default function Compare() {
  const scored = VERSIONS.filter((v) => SCORES[v.id]);
  return (
    <main className="cp">
      <header className="cp-top">
        <h1>Four versions of hemosoo.com</h1>
        <p>
          The site as it is, and three alternatives built from the same content. Each opens in full at its own
          address; nothing here is part of the sites themselves.
        </p>
        <nav aria-label="Versions">
          {VERSIONS.map((v) => (
            <a key={v.id} href={`#${v.id}`}>
              {v.name}
            </a>
          ))}
        </nav>
      </header>

      <div className="cp-grid">
        {VERSIONS.map((v, i) => (
          <Entry key={v.id} v={v} n={i} />
        ))}
      </div>

      {scored.length > 0 && (
        <section className="cp-table" aria-labelledby="scores">
          <h2 id="scores">How they compare</h2>
          <p>Scored 1 to 5 after building and reviewing each at desktop, tablet and phone widths.</p>
          <div className="cp-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Criterion</th>
                  {scored.map((v) => (
                    <th key={v.id} scope="col">
                      {v.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CRITERIA.map((c, i) => (
                  <tr key={c}>
                    <th scope="row">{c}</th>
                    {scored.map((v) => {
                      const s = SCORES[v.id]![i];
                      return (
                        <td key={v.id}>
                          <span className="cp-dots" aria-label={`${s} of 5`}>
                            {[1, 2, 3, 4, 5].map((k) => (
                              <i key={k} className={k <= s ? "on" : ""} />
                            ))}
                          </span>
                          <span className="cp-num">{s}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

