"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, type Variants } from "framer-motion";
import { useReducedMotion } from "@/lib/hooks";
import { useLenis } from "./SmoothScroll";
import { content } from "@/data/content";

type Phase = "idle" | "cover" | "reveal";

const TransitionContext = createContext<{ navigate: (href: string) => void }>({
  navigate: () => {},
});
export const usePageTransition = () => useContext(TransitionContext);

const EASE = [0.76, 0, 0.24, 1] as const;

const layer: Variants = {
  idle: { clipPath: "inset(100% 0% 0% 0%)", transition: { duration: 0 } },
  cover: (i: number) => ({
    clipPath: "inset(0% 0% 0% 0%)",
    transition: { duration: 0.75, ease: EASE, delay: i * 0.08 },
  }),
  reveal: (i: number) => ({
    clipPath: "inset(0% 0% 100% 0%)",
    transition: { duration: 0.75, ease: EASE, delay: (1 - i) * 0.08 },
  }),
};

/**
 * Переходы между страницами через шторку:
 * 1) шторка закрывает экран → 2) router.push → 3) новая страница смонтирована → шторка уезжает вверх.
 */
export function TransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const lenis = useLenis();
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("idle");
  const pending = useRef<string | null>(null);

  const navigate = useCallback(
    (href: string) => {
      if (phase !== "idle") return;
      if (reduced) {
        router.push(href);
        return;
      }
      pending.current = href;
      router.prefetch(href);
      setPhase("cover");
    },
    [phase, reduced, router],
  );

  // Новая страница смонтирована — открываем шторку
  useEffect(() => {
    const href = pending.current;
    if (phase === "cover" && href && pathname === href.split("#")[0]) {
      pending.current = null;
      const id = requestAnimationFrame(() => setPhase("reveal"));
      return () => cancelAnimationFrame(id);
    }
  }, [pathname, phase]);

  const onLayerDone = () => {
    if (phase === "cover" && pending.current) {
      lenis?.scrollTo(0, { immediate: true, force: true });
      window.scrollTo(0, 0);
      router.push(pending.current, { scroll: false });
    } else if (phase === "reveal") {
      setPhase("idle");
    }
  };

  return (
    <TransitionContext.Provider value={{ navigate }}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[90]" aria-hidden>
        <motion.div
          className="absolute inset-0 bg-accent"
          custom={0}
          variants={layer}
          initial="idle"
          animate={phase}
        />
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-[#111]"
          custom={1}
          variants={layer}
          initial="idle"
          animate={phase}
          onAnimationComplete={onLayerDone}
        >
          <span className="font-display text-sm uppercase tracking-[0.4em] text-fg/60">
            {content.brand.make} {content.brand.model}
          </span>
        </motion.div>
      </div>
    </TransitionContext.Provider>
  );
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

/** Ссылка с переходом через шторку */
export function TransitionLink({ href, onClick, children, ...rest }: LinkProps) {
  const { navigate } = usePageTransition();
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(href);
  };
  return (
    <a href={href} onClick={handle} {...rest}>
      {children}
    </a>
  );
}
