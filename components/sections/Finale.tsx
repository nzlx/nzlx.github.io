"use client";

import { content } from "@/data/content";
import { Magnetic } from "@/components/ui/Magnetic";
import { useScrollTo } from "@/components/providers/SmoothScroll";
import { SectionLabel } from "./SectionLabel";

/** Финал: машина собирается, включаются фары. Имя — и футер с атрибуцией модели. */
export function Finale() {
  const { finale, footer } = content.sections;
  const a = footer.attribution;
  const scrollTo = useScrollTo();

  return (
    <section id="finale" className="relative flex min-h-[140svh] flex-col justify-between px-5 pb-8 pt-32 md:px-10 md:pb-10">
      <div>
        <SectionLabel index={finale.index}>{finale.label}</SectionLabel>
        <h2 className="font-display text-[22vw] font-medium uppercase leading-[0.85] tracking-[-0.04em] md:text-[13vw]">
          {finale.title}
        </h2>
        <p className="mt-6 max-w-xl font-display text-2xl leading-tight text-fg/80 md:text-4xl">{finale.text}</p>
      </div>

      {/* Пространство под машину с включёнными фарами */}
      <div className="h-[30svh]" aria-hidden />

      <div>
        <div className="flex justify-start border-t border-line pt-10 md:justify-end">
          <Magnetic strength={0.5}>
            <button
              onClick={() => scrollTo(0)}
              className="group relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-accent font-display text-base font-medium uppercase tracking-wide text-black md:h-40 md:w-40 md:text-lg"
            >
              <span className="absolute inset-0 translate-y-full rounded-full bg-fg transition-transform duration-500 ease-out group-hover:translate-y-0" />
              <span className="relative">↑ {finale.backToTop}</span>
            </button>
          </Magnetic>
        </div>

        <footer className="mt-12 grid gap-4 text-xs text-muted md:grid-cols-[auto_1fr_auto] md:items-end md:gap-10">
          <span className="uppercase tracking-[0.2em] text-fg/80">{footer.project}</span>
          {/* Атрибуция модели (CC BY 4.0) и фотографий (CC BY / CC BY-SA) */}
          <span className="flex flex-col gap-2 leading-relaxed md:text-center">
            <span>
              {a.prefix} «
              <a href={a.url} target="_blank" rel="noreferrer" className="link-underline text-fg/80">
                {a.title}
              </a>
              » {a.by} {a.author},{" "}
              <a href={a.licenseUrl} target="_blank" rel="noreferrer" className="link-underline text-fg/80">
                {a.license}
              </a>
              , {a.changes}
            </span>
            <span>
              {footer.photos.prefix}:{" "}
              {content.facts.map((f, i) => (
                <span key={f.photo.src}>
                  {i > 0 && " · "}
                  <a href={f.photo.sourceUrl} target="_blank" rel="noreferrer" className="link-underline text-fg/80">
                    {f.photo.author}
                  </a>{" "}
                  /{" "}
                  <a href={f.photo.licenseUrl} target="_blank" rel="noreferrer" className="link-underline">
                    {f.photo.license}
                  </a>
                </span>
              ))}
              {" "}— Wikimedia Commons, {footer.photos.changes}
            </span>
          </span>
          <span className="max-w-xs leading-relaxed md:text-right">{footer.disclaimer}</span>
        </footer>
      </div>
    </section>
  );
}
