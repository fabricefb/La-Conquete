'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { X, Search, Bookmark, BookmarkCheck, BookOpen, ChevronDown } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════
   Bible Data — Popular Verses (Louis Segond)
   ═══════════════════════════════════════════════════════════════════ */
interface Verse {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
  text: string;
  reference: string;
}

const POPULAR_VERSES: Verse[] = [
  {
    book: 'Psaumes', chapter: 23, verseStart: 1, verseEnd: 4,
    text: 'L\'Éternel est mon berger: je ne manquerai de rien.\nIl me fait reposer dans de verts pâturages,\nIl me dirige près des eaux paisibles.\nIl restaure mon âme.',
    reference: 'Psaumes 23:1-4',
  },
  {
    book: 'Jean', chapter: 3, verseStart: 16, verseEnd: null,
    text: 'Car Dieu a tant aimé le monde qu\'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu\'il ait la vie éternelle.',
    reference: 'Jean 3:16',
  },
  {
    book: 'Romains', chapter: 8, verseStart: 28, verseEnd: null,
    text: 'Nous savons, du reste, que toutes choses concourent au bien de ceux qui aiment Dieu, de ceux qui sont appelés selon son dessein.',
    reference: 'Romains 8:28',
  },
  {
    book: 'Philippiens', chapter: 4, verseStart: 13, verseEnd: null,
    text: 'Je peux tout par celui qui me fortifie.',
    reference: 'Philippiens 4:13',
  },
  {
    book: 'Jérémie', chapter: 29, verseStart: 11, verseEnd: null,
    text: 'Car je connais les projets que j\'ai formés sur vous, dit l\'Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de espérance.',
    reference: 'Jérémie 29:11',
  },
  {
    book: 'Ésaïe', chapter: 41, verseStart: 10, verseEnd: null,
    text: 'Ne crains rien, car je suis avec toi; ne promène pas des regards inquiets, car je suis ton Dieu; je te fortifie, je viens à ton secours, je te soutiens de ma droite triomphante.',
    reference: 'Ésaïe 41:10',
  },
  {
    book: 'Proverbes', chapter: 3, verseStart: 5, verseEnd: 6,
    text: 'Confie-toi en l\'Éternel de tout ton cœur, et ne t\'appuie pas sur ta sagesse;\nReconnais-le dans toutes tes voies, et il aplanira tes sentiers.',
    reference: 'Proverbes 3:5-6',
  },
];

const BIBLE_BOOKS = [
  'Genèse','Exode','Lévitique','Nombres','Deutéronome',
  'Josué','Juges','Ruth','1 Samuel','2 Samuel',
  '1 Rois','2 Rois','1 Chroniques','2 Chroniques','Esdras',
  'Néhémie','Esther','Job','Psaumes','Proverbes',
  'Ecclésiaste','Cantique des Cantiques','Ésaïe','Jérémie','Lamentations',
  'Ézéchiel','Daniel','Osée','Joël','Amos',
  'Abdias','Jonas','Michée','Nahum','Habacuc',
  'Sophonie','Aggée','Zacharie','Malachie',
  'Matthieu','Marc','Luc','Jean','Actes',
  'Romains','1 Corinthiens','2 Corinthiens','Galates','Éphésiens',
  'Philippiens','Colossiens','1 Thessaloniciens','2 Thessaloniciens','1 Timothée',
  '2 Timothée','Tite','Philémon','Hébreux','Jacques',
  '1 Pierre','2 Pierre','1 Jean','2 Jean','3 Jean',
  'Jude','Apocalypse',
];

/* ═══════════════════════════════════════════════════════════════════
   BibleReader Component
   ═══════════════════════════════════════════════════════════════════ */
export function BibleReader({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [selectedBook, setSelectedBook] = useState(BIBLE_BOOKS[18]); // Psaumes
  const [selectedChapter, setSelectedChapter] = useState(23);
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [showBookDropdown, setShowBookDropdown] = useState(false);
  const [showQuickVerses, setShowQuickVerses] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load bookmarks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lc_bible_bookmarks');
      if (saved) setBookmarks(JSON.parse(saved));
    } catch { /* empty */ }
  }, []);

  const saveBookmark = (ref: string) => {
    const updated = bookmarks.includes(ref)
      ? bookmarks.filter(b => b !== ref)
      : [...bookmarks, ref];
    setBookmarks(updated);
    localStorage.setItem('lc_bible_bookmarks', JSON.stringify(updated));
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowBookDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Filter verses by search
  const filteredVerses = useMemo(() => {
    if (!searchQuery.trim()) return POPULAR_VERSES;
    const q = searchQuery.toLowerCase();
    return POPULAR_VERSES.filter(
      v => v.text.toLowerCase().includes(q) || v.reference.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const currentVerse = POPULAR_VERSES.find(
    v => v.book === selectedBook && v.chapter === selectedChapter
  );

  const currentRef = currentVerse?.reference || `${selectedBook} ${selectedChapter}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="glass relative z-10 w-full max-w-2xl rounded-t-3xl md:rounded-3xl max-h-[90vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-400/15">
              <BookOpen className="h-5 w-5 text-accent-500" />
            </div>
            <div>
              <h2 className="font-headline text-lg text-cream">Lecteur Biblique</h2>
              <p className="text-xs text-muted">Louis Segond 1910</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-cream/60 hover:bg-white/5 hover:text-cream transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Rechercher un verset..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowQuickVerses(true); }}
              className="input-surface w-full py-2.5 pl-10 pr-4 text-sm"
            />
          </div>
        </div>

        {/* Book & Chapter Selectors */}
        {!searchQuery && (
          <div className="flex items-center gap-2 px-6 pt-3">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowBookDropdown(!showBookDropdown)}
                className="input-surface flex items-center gap-2 px-3 py-2 text-sm text-cream min-w-[160px]"
              >
                <span className="truncate">{selectedBook}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted ml-auto shrink-0" />
              </button>
              {showBookDropdown && (
                <div className="absolute top-full left-0 z-20 mt-1 glass rounded-2xl max-h-60 w-72 overflow-y-auto scrollbar-hide shadow-glass-lg">
                  <div className="p-2 grid grid-cols-2 gap-0.5">
                    {BIBLE_BOOKS.map(b => (
                      <button
                        key={b}
                        onClick={() => { setSelectedBook(b); setShowBookDropdown(false); setShowQuickVerses(false); }}
                        className={`text-left rounded-lg px-3 py-1.5 text-xs transition truncate ${
                          b === selectedBook ? 'bg-accent-400/20 text-accent-500 font-medium' : 'text-cream/80 hover:bg-white/5'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button onClick={() => { setSelectedChapter(Math.max(1, selectedChapter - 1)); setShowQuickVerses(false); }} className="input-surface px-3 py-2 text-sm text-cream/80 hover:text-cream transition">
                −
              </button>
              <div className="input-surface flex items-center justify-center w-12 py-2 text-sm text-cream font-medium text-center">
                {selectedChapter}
              </div>
              <button onClick={() => { setSelectedChapter(selectedChapter + 1); setShowQuickVerses(false); }} className="input-surface px-3 py-2 text-sm text-cream/80 hover:text-cream transition">
                +
              </button>
            </div>
          </div>
        )}

        {/* Verse Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 scrollbar-hide space-y-4">
          {searchQuery ? (
            /* Search results */
            filteredVerses.length > 0 ? filteredVerses.map((v, i) => (
              <div key={i} className="glass-card rounded-2xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-headline text-sm text-accent-500">{v.reference}</span>
                  <button onClick={() => saveBookmark(v.reference)} className="p-1 text-muted hover:text-accent-500 transition">
                    {bookmarks.includes(v.reference) ? <BookmarkCheck className="h-4 w-4 text-accent-500" /> : <Bookmark className="h-4 w-4" />}
                  </button>
                </div>
                <p className="font-body text-sm leading-relaxed text-cream whitespace-pre-line">{v.text}</p>
              </div>
            )) : (
              <p className="text-center text-muted py-12 text-sm">Aucun verset trouvé pour « {searchQuery} »</p>
            )
          ) : showQuickVerses ? (
            /* Quick access popular verses */
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">Versets populaires</p>
              {POPULAR_VERSES.map((v, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedBook(v.book); setSelectedChapter(v.chapter); setShowQuickVerses(false); }}
                  className="w-full text-left glass-card rounded-2xl p-4 hover:bg-white/5 transition space-y-1 group"
                >
                  <span className="font-headline text-sm text-accent-500 group-hover:text-accent-300 transition">{v.reference}</span>
                  <p className="font-body text-xs text-muted line-clamp-2">{v.text.split('\n')[0]}</p>
                </button>
              ))}
            </div>
          ) : currentVerse ? (
            /* Selected verse display */
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-headline text-headline-sm text-accent-500">{currentVerse.reference}</span>
                <button onClick={() => saveBookmark(currentRef)} className="p-1 text-muted hover:text-accent-500 transition">
                  {bookmarks.includes(currentRef) ? <BookmarkCheck className="h-5 w-5 text-accent-500" /> : <Bookmark className="h-5 w-5" />}
                </button>
              </div>
              <p className="font-body text-body-lg leading-relaxed text-cream whitespace-pre-line">{currentVerse.text}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="h-12 w-12 text-muted/30 mb-4" />
              <p className="text-cream/60 text-sm">Chapitre non disponible dans la démo.</p>
              <p className="text-muted text-xs mt-1">Utilisez la recherche ou les versets populaires.</p>
            </div>
          )}

          {/* Bookmarks section */}
          {bookmarks.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">Mes signets</p>
              <div className="flex flex-wrap gap-2">
                {bookmarks.map(b => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1.5 rounded-full bg-accent-400/10 px-3 py-1 text-xs text-accent-500"
                  >
                    <BookmarkCheck className="h-3 w-3" />
                    {b}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}