import { useEffect, useRef, useState } from 'react';
import { X, Calendar, Clock, ArrowUpRight, ArrowRight, MessageCircle, Copy, Check } from '../lib/icons';
import { articleDate, readingTime, type Article } from '../lib/articles';

interface ArticleReaderProps {
  article: Article | null;
  onClose: () => void;
  onNavigate?: (page: 'contact') => void;
}

export function ArticleReader({ article, onClose, onNavigate }: ArticleReaderProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setProgress(0);
    setCopied(false);
  }, [article?.slug]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!article) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [article, onClose]);

  if (!article) return null;

  const shareUrl = `${window.location.origin}${window.location.pathname}#blog/${encodeURIComponent(article.slug)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${article.title} — ${shareUrl}`)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      window.prompt('Copier le lien de l’article :', shareUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-[130]" role="dialog" aria-modal="true" aria-labelledby="article-reader-title">
      <button
        type="button"
        aria-label="Fermer l'article"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-sm"
        tabIndex={-1}
      />

      <div className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col border-l border-line bg-bg shadow-2xl">
        <div className="h-0.5 w-full shrink-0 bg-line" aria-hidden="true">
          <div
            className="h-full bg-evangile-600 transition-[width] duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
        <header className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="rule-accent" />
            <p className="section-eyebrow">{article.category}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center border border-line text-muted transition-colors hover:border-evangile-600 hover:text-cream"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div
          className="flex-1 overflow-y-auto"
          onScroll={(event) => {
            const el = event.currentTarget;
            const max = el.scrollHeight - el.clientHeight;
            setProgress(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0);
          }}
        >
          <div className="relative h-56 overflow-hidden sm:h-72">
            <img src={article.image} alt="" className="photo-claro h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-transparent" />
          </div>

          <div className="px-5 pb-16 sm:px-8">
            <div className="-mt-10 relative">
              <h1 id="article-reader-title" className="editorial-title max-w-2xl text-cream text-3xl sm:text-4xl">
                {article.title}
              </h1>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line pb-6 text-xs uppercase tracking-[0.12em] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {articleDate(article.date)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Lecture {readingTime(article)}
              </span>
            </div>

            <div className="mt-8 space-y-5">
              {article.body.map((paragraph, i) => (
                <p key={i} className="text-[15px] leading-8 text-cream/85">
                  {paragraph}
                </p>
              ))}
            </div>

            {article.quote && (
              <blockquote className="mt-10 border-l-2 pl-5" style={{ borderColor: 'rgb(var(--brand-red-rgb))' }}>
                <p className="verse-quote text-cream">&laquo; {article.quote.text} &raquo;</p>
                <footer className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  {article.quote.reference}
                </footer>
              </blockquote>
            )}

            <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-line pt-8">
              {onNavigate && (
                <button type="button" className="btn-primary" onClick={() => { onClose(); onNavigate('contact'); }}>
                  Nous contacter
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
              {article.source && (
                <a href={article.source} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                  Voir la publication d'origine
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              )}
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                <MessageCircle className="h-4 w-4" />
                Partager sur WhatsApp
              </a>
              <button type="button" onClick={handleCopy} className="btn-ghost" aria-live="polite">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Lien copié' : 'Copier le lien'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
