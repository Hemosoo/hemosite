/**
 * The stat line: the same figures as the back of the player card, laid out to
 * be scanned, each with a way to the card it comes from. Then the toolkit,
 * from the résumé, as plain lines.
 */
import { CERTIFICATIONS, STATS, TOOLKIT } from "../../content/profile";
import { ALL_CARDS, targetOfNode } from "./collection";

const VAR: Record<string, string> = {
  experience: "var(--c-exp)",
  education: "var(--c-edu)",
  engineering: "var(--c-eng)",
  personal: "var(--c-per)",
};

export default function StatLine({ onStat }: { onStat: (node: string) => void }) {
  return (
    <section id="stats" className="v3-stats" aria-labelledby="stats-h">
      <div className="v3-stats-head">
        <h2 id="stats-h">Stat line</h2>
        <p>The back of the player card, at reading size. Each figure opens the card it comes from.</p>
      </div>
      <ul className="v3-stats-list">
        {STATS.map((s) => {
          const t = targetOfNode(s.node);
          const where = t.card ? ALL_CARDS.find((c) => c.id === t.card)?.title : "Experience";
          return (
            <li key={s.label} style={{ ["--c" as string]: VAR[s.category] }}>
              <button type="button" onClick={() => onStat(s.node)}>
                <span className="v">{s.value}</span>
                <span className="l">{s.label}</span>
                <span className="w">{where} →</span>
              </button>
            </li>
          );
        })}
      </ul>
      <dl className="v3-kit">
        {TOOLKIT.map((t) => (
          <div key={t.group}>
            <dt>{t.group}</dt>
            <dd>{t.items.join(" · ")}</dd>
          </div>
        ))}
        {CERTIFICATIONS.map((c) => (
          <div key={c.name}>
            <dt>Certified</dt>
            <dd>
              {c.name}, {c.date}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
