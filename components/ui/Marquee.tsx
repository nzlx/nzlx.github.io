import { content } from "@/data/content";

/** Бегущая строка с технологиями (чистый CSS, пауза при prefers-reduced-motion) */
export function Marquee({ reverse = false, items = content.marquee }: { reverse?: boolean; items?: string[] }) {
  return (
    <div className="relative z-10 overflow-hidden border-y border-line bg-bg/60 py-5 backdrop-blur-sm md:py-7">
      <div className={`marquee__track ${reverse ? "marquee__track--reverse" : ""}`}>
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center gap-8 pr-8 md:gap-12 md:pr-12" aria-hidden={copy === 1}>
            {items.map((item) => (
              <li key={item} className="flex items-center gap-8 md:gap-12">
                <span className="font-display text-3xl uppercase tracking-tight text-fg md:text-6xl">{item}</span>
                <span className="text-xl text-accent md:text-3xl">✦</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
