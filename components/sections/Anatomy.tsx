import { content } from "@/data/content";
import { SectionLabel } from "./SectionLabel";

/**
 * Устройство: высокая секция со sticky-контентом. Пока она прокручивается,
 * машина разбирается по слоям; у деталей — подписи, по клику — режим осмотра.
 * .anatomy-head и .anatomy-list задают безопасную зону для подписей (LabelLayout).
 */
export function Anatomy() {
  const anatomy = content.sections.anatomy;
  return (
    <section id="anatomy" className="relative min-h-[260svh]">
      <div className="sticky top-0 flex h-svh flex-col justify-between px-5 pb-8 pt-24 md:px-10 md:pt-28">
        <div className="anatomy-head max-w-sm">
          <SectionLabel index={anatomy.index}>{anatomy.label}</SectionLabel>
          <p className="font-display text-2xl leading-tight text-fg/80 md:text-3xl">{anatomy.subtitle}</p>
          <p className="mt-4 hidden text-xs uppercase tracking-[0.25em] text-accent md:block">{anatomy.hint}</p>
        </div>
        {/* Текстовый список — дублирует подписи для скринридеров и мобильных */}
        <ul className="anatomy-list grid grid-cols-1 gap-x-6 gap-y-2 border-t border-line pt-4 text-xs sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {content.parts.map((p) => (
            <li key={p.id} className="flex flex-col">
              <span className="text-fg">{p.title}</span>
              <span className="text-muted">{p.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
