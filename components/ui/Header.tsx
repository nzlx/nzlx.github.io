"use client";

import { useEffect, useState } from "react";
import { content } from "@/data/content";
import { useScrollTo } from "@/components/providers/SmoothScroll";
import { Magnetic } from "./Magnetic";

export function Header() {
  const scrollTo = useScrollTo();
  const [scrolled, setScrolled] = useState(false);

  // После начала прокрутки — тёмная подложка с размытием, чтобы заголовки секций не наезжали на меню
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 transition-[background-color,padding,border-color] duration-500 md:px-10 ${
        scrolled
          ? "border-b border-line bg-bg/75 py-3 backdrop-blur-md md:py-4"
          : "border-b border-transparent py-5 mix-blend-difference md:py-7"
      }`}
    >
      <button
        onClick={() => scrollTo(0)}
        className="font-display text-lg font-semibold tracking-tight text-white"
        aria-label="Наверх"
      >
        {content.brand.mark}
        <span className="text-accent">.</span>
      </button>

      <nav className="hidden gap-8 md:flex" aria-label="Основная навигация">
        {content.nav.map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={(e) => {
              e.preventDefault();
              scrollTo(item.href);
            }}
            className="link-underline text-sm text-white"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <Magnetic strength={0.3}>
        <a
          href={content.header.ctaHref}
          onClick={(e) => {
            e.preventDefault();
            scrollTo(content.header.ctaHref);
          }}
          className="rounded-full border border-white/30 px-4 py-2 text-xs uppercase tracking-[0.18em] text-white transition-colors hover:bg-white hover:text-black"
        >
          {content.header.cta}
        </a>
      </Magnetic>
    </header>
  );
}
