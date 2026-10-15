import { content } from "@/data/content";
import { TransitionLink } from "@/components/providers/TransitionProvider";

export default function NotFound() {
  return (
    <main className="relative z-10 flex min-h-svh flex-col items-center justify-center gap-6 px-5 text-center">
      <p className="font-display text-[30vw] font-medium leading-none tracking-tighter md:text-[18vw]">
        4<span className="text-accent">0</span>4
      </p>
      <p className="text-muted">{content.notFound.text}</p>
      <TransitionLink href="/" className="link-underline uppercase tracking-[0.2em]">
        {content.notFound.back}
      </TransitionLink>
    </main>
  );
}
