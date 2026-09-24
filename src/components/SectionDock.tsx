import { Dock, DockItem } from "./godui/dock";

interface Item {
  id: number;
  title: string;
  sectionId: string;
  icon: string;
}

interface Props {
  items: Item[];
  activeId: number;
  onNavigate: (sectionId: string) => void;
}

export default function SectionDock({ items, activeId, onNavigate }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 hidden justify-center px-4 md:flex">
      <Dock className="pointer-events-auto" baseSize={40} magnification={64} distance={120}>
        {items.map((item) => (
          <DockItem
            key={item.id}
            label={item.title}
            onClick={() => onNavigate(item.sectionId)}
            role="button"
            tabIndex={0}
            aria-label={item.title}
            className={`cursor-pointer transition-colors ${
              item.id === activeId
                ? "!bg-primary text-[#0b0d10]"
                : "hover:!bg-surface-2"
            }`}
          >
            <span className="text-sm font-bold">{item.icon}</span>
          </DockItem>
        ))}
      </Dock>
    </div>
  );
}
