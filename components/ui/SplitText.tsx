/** Разбивка текста на буквы / слова для анимаций. Скринридеры читают исходную строку. */

export function SplitLetters({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(" ").map((word, w) => (
        <span key={w} className="inline-block whitespace-nowrap" aria-hidden>
          {[...word].map((ch, i) => (
            <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
              {/* Стартовое положение — inline transform (GSAP перезапишет его, в отличие от CSS `translate`) */}
              <span className="char inline-block will-change-transform" style={{ transform: "translateY(115%)" }}>
                {ch}
              </span>
            </span>
          ))}
          {w < text.split(" ").length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </span>
  );
}

export function SplitWords({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(" ").map((word, i) => (
        <span key={i} className="word inline-block opacity-[0.12]" aria-hidden>
          {word}
          {" "}
        </span>
      ))}
    </span>
  );
}
