import Equalizer from "./Equalizer";

interface NavItem {
  id: number;
  title: string;
  sectionId: string;
}

interface Props {
  items: NavItem[];
  activeId: number;
  isPlaying: boolean;
  resumeHref: string;
  onNavigate: (sectionId: string) => void;
}

/** Fixed rail on large screens. Below lg the track table already serves as
 *  navigation, so this is hidden rather than duplicated into a drawer. */
export default function Sidebar({ items, activeId, isPlaying, resumeHref, onNavigate }: Props) {
  return (
    <nav
      aria-label="Sections"
      className="hidden lg:flex fixed top-0 bottom-[104px] left-0 w-60 z-40 flex-col gap-6 bg-black border-r border-white/5 px-3 py-6"
    >
      <span className="px-3 text-lg font-black tracking-tight">Hemosoo</span>

      <ul className="flex flex-col gap-1 flex-1 min-h-0 overflow-y-auto">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <button
                onClick={() => onNavigate(item.sectionId)}
                aria-current={active ? "true" : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded text-left text-sm transition-colors ${
                  active ? "bg-white/10 text-white font-semibold" : "text-[#A7A7A7] hover:text-white"
                }`}
              >
                <span className="w-5 flex-shrink-0 grid place-items-center">
                  {active && isPlaying ? (
                    <Equalizer />
                  ) : (
                    <span className="text-xs tabular-nums text-[#6A6A6A]">{item.id}</span>
                  )}
                </span>
                <span className="truncate">{item.title}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-1 border-t border-white/10 pt-4">
        {[
          { label: "Resume", href: resumeHref },
          { label: "GitHub", href: "https://github.com/Hemosoo" },
          { label: "LinkedIn", href: "https://www.linkedin.com/in/hemosoowoo" },
        ].map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 text-sm text-[#A7A7A7] hover:text-white transition-colors"
          >
            {l.label} ↗
          </a>
        ))}
      </div>
    </nav>
  );
}
