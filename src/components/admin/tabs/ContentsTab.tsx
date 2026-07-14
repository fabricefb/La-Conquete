import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { Save, Plus, Trash2, X, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────

type ContentType = 'text' | 'html' | 'image_url' | 'url';

interface PageContent {
  id: string;
  page: string;
  section_key: string;
  field_key: string;
  label: string;
  value: string;
  type: ContentType;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
}

const PAGES: { key: string; label: string }[] = [
  { key: 'home', label: 'Accueil' },
  { key: 'about', label: 'À propos' },
  { key: 'activities', label: 'Activités' },
  { key: 'events', label: 'Événements' },
  { key: 'media', label: 'Médias' },
  { key: 'contact', label: 'Contact' },
];

// ─── Component ──────────────────────────────────────────────────────

export function ContentsTab() {
  const { addToast } = useToast();
  const [activePage, setActivePage] = useState(PAGES[0].key);
  const [contents, setContents] = useState<PageContent[]>([]);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [draftActive, setDraftActive] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [savingSections, setSavingSections] = useState<Set<string>>(new Set());
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  // ── Add-field modal state ──
  const [addModal, setAddModal] = useState<{ sectionKey: string } | null>(null);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<ContentType>('text');

  // ── Delete confirm state ──
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ── Fetch contents ──

  useEffect(() => {
    const fetchContents = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('page_contents')
        .select('*')
        .eq('page', activePage)
        .order('sort_order');

      if (error) {
        addToast('Erreur lors du chargement du contenu', 'error');
        setLoading(false);
        return;
      }

      const rows: PageContent[] = data ?? [];
      setContents(rows);

      const vals: Record<string, string> = {};
      const acts: Record<string, boolean> = {};
      const sections = new Set<string>();
      for (const r of rows) {
        vals[r.id] = r.value;
        acts[r.id] = r.is_active;
        sections.add(r.section_key);
      }
      setDraftValues(vals);
      setDraftActive(acts);
      setOpenSections(sections);
      setLoading(false);
    };

    void fetchContents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage]);

  // ── Grouped by section ──

  const sections = new Map<string, PageContent[]>();
  for (const c of contents) {
    const list = sections.get(c.section_key) ?? [];
    list.push(c);
    sections.set(c.section_key, list);
  }

  // ── Handlers ──

  const handleValueChange = useCallback((id: string, val: string) => {
    setDraftValues((prev) => ({ ...prev, [id]: val }));
  }, []);

  const handleActiveToggle = useCallback((id: string, checked: boolean) => {
    setDraftActive((prev) => ({ ...prev, [id]: checked }));
  }, []);

  const toggleSection = useCallback((key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ── Save section ──

  const saveSection = useCallback(
    async (sectionKey: string) => {
      const items = sections.get(sectionKey) ?? [];
      if (items.length === 0) return;

      setSavingSections((prev) => new Set(prev).add(sectionKey));
      const now = new Date().toISOString();

      const results = await Promise.allSettled(
        items.map((item) => {
          const newValue = draftValues[item.id] ?? item.value;
          const newActive = draftActive[item.id] ?? item.is_active;
          return supabase
            .from('page_contents')
            .update({ value: newValue, is_active: newActive, updated_at: now })
            .eq('id', item.id);
        }),
      );

      const failed = results.filter((r) => r.status === 'rejected').length;

      if (failed === 0) {
        addToast(`Section "${sectionKey}" sauvegardée`, 'success');
        // Refresh data
        const { data } = await supabase
          .from('page_contents')
          .select('*')
          .eq('page', activePage)
          .order('sort_order');
        if (data) {
          setContents(data as PageContent[]);
          const vals: Record<string, string> = {};
          const acts: Record<string, boolean> = {};
          for (const r of data) {
            vals[r.id] = r.value;
            acts[r.id] = r.is_active;
          }
          setDraftValues(vals);
          setDraftActive(acts);
        }
      } else {
        addToast(
          `${failed} champ(s) n'ont pas pu être sauvegardés`,
          'error',
        );
      }

      setSavingSections((prev) => {
        const next = new Set(prev);
        next.delete(sectionKey);
        return next;
      });
    },
    [sections, draftValues, draftActive, activePage, addToast],
  );

  // ── Add field ──

  const handleAddField = useCallback(async () => {
    if (!addModal) return;
    const { sectionKey } = addModal;
    const key = newFieldKey.trim();
    const label = newFieldLabel.trim();

    if (!key || !label) {
      addToast('Veuillez remplir la clé et le libellé', 'error');
      return;
    }

    // Determine sort_order
    const existing = sections.get(sectionKey) ?? [];
    const maxSort = existing.reduce((max, c) => Math.max(max, c.sort_order), 0);

    const { error } = await supabase.from('page_contents').insert({
      page: activePage,
      section_key: sectionKey,
      field_key: key,
      label,
      value: '',
      type: newFieldType,
      is_active: true,
      sort_order: maxSort + 1,
    });

    if (error) {
      addToast("Erreur lors de l'ajout du champ", 'error');
      return;
    }

    addToast('Champ ajouté', 'success');
    setAddModal(null);
    setNewFieldKey('');
    setNewFieldLabel('');
    setNewFieldType('text');

    // Refresh
    const { data } = await supabase
      .from('page_contents')
      .select('*')
      .eq('page', activePage)
      .order('sort_order');
    if (data) {
      setContents(data as PageContent[]);
      const vals: Record<string, string> = {};
      const acts: Record<string, boolean> = {};
      for (const r of data) {
        vals[r.id] = r.value;
        acts[r.id] = r.is_active;
      }
      setDraftValues(vals);
      setDraftActive(acts);
    }
  }, [addModal, newFieldKey, newFieldLabel, newFieldType, activePage, sections, addToast]);

  // ── Delete field ──

  const handleDeleteField = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from('page_contents')
        .delete()
        .eq('id', id);

      if (error) {
        addToast('Erreur lors de la suppression', 'error');
        return;
      }

      addToast('Champ supprimé', 'success');
      setDeleteConfirmId(null);

      setContents((prev) => prev.filter((c) => c.id !== id));
      setDraftValues((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setDraftActive((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [addToast],
  );

  // ── Section dirty check ──

  const isSectionDirty = useCallback(
    (sectionKey: string) => {
      const items = sections.get(sectionKey) ?? [];
      return items.some((item) => {
        return (
          draftValues[item.id] !== item.value ||
          draftActive[item.id] !== item.is_active
        );
      });
    },
    [sections, draftValues, draftActive],
  );

  // ── Render input ──

  const renderInput = (item: PageContent) => {
    const val = draftValues[item.id] ?? '';

    switch (item.type) {
      case 'text':
        return (
          <textarea
            value={val}
            onChange={(e) => handleValueChange(item.id, e.target.value)}
            rows={3}
            className="input-surface w-full px-4 py-2.5 text-sm"
            placeholder={item.label}
          />
        );

      case 'html':
        return (
          <textarea
            value={val}
            onChange={(e) => handleValueChange(item.id, e.target.value)}
            rows={6}
            className="input-surface w-full px-4 py-2.5 text-sm font-mono"
            placeholder={item.label}
          />
        );

      case 'image_url':
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={val}
              onChange={(e) => handleValueChange(item.id, e.target.value)}
              className="input-surface w-full px-4 py-2.5 text-sm"
              placeholder="https://..."
            />
            {val && (
              <div className="relative inline-block">
                <img
                  src={val}
                  alt={item.label}
                  className="h-20 w-20 rounded-lg border border-line object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        );

      case 'url':
        return (
          <input
            type="text"
            value={val}
            onChange={(e) => handleValueChange(item.id, e.target.value)}
            className="input-surface w-full px-4 py-2.5 text-sm"
            placeholder="https://..."
          />
        );

      default:
        return (
          <input
            type="text"
            value={val}
            onChange={(e) => handleValueChange(item.id, e.target.value)}
            className="input-surface w-full px-4 py-2.5 text-sm"
            placeholder={item.label}
          />
        );
    }
  };

  // ── Add field modal ──

  const renderAddModal = () => {
    if (!addModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="glass rounded-2xl p-6 w-full max-w-md mx-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-cream">
              Ajouter un champ
            </h3>
            <button
              type="button"
              onClick={() => setAddModal(null)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-evangile-600/40 hover:text-evangile-500 transition"
            >
              <X size={16} />
            </button>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Clé du champ
            </label>
            <input
              type="text"
              value={newFieldKey}
              onChange={(e) => setNewFieldKey(e.target.value)}
              className="input-surface w-full px-4 py-2.5 text-sm"
              placeholder="ex: hero_subtitle"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Libellé
            </label>
            <input
              type="text"
              value={newFieldLabel}
              onChange={(e) => setNewFieldLabel(e.target.value)}
              className="input-surface w-full px-4 py-2.5 text-sm"
              placeholder="ex: Sous-titre du héros"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Type
            </label>
            <select
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value as ContentType)}
              className="input-surface w-full px-4 py-2.5 text-sm"
            >
              <option value="text">Texte</option>
              <option value="html">HTML</option>
              <option value="image_url">URL d'image</option>
              <option value="url">URL</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setAddModal(null)}
              className="btn-ghost px-4 py-2 text-sm rounded-xl transition"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => void handleAddField()}
              className="btn-gold px-4 py-2 text-sm font-medium rounded-xl transition"
            >
              Ajouter
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── Loading skeleton ──

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 rounded-lg bg-white/5 animate-pulse" />
        <div className="glass rounded-2xl p-6 space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3 animate-pulse">
              <div className="h-6 w-40 rounded-lg bg-white/5" />
              <div className="ml-4 space-y-2">
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="h-20 rounded-lg bg-white/5" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-2xl font-semibold text-cream">
        Contenus des pages
      </h2>

      {/* Page selector */}
      <div className="flex flex-wrap gap-2">
        {PAGES.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setActivePage(p.key)}
            className={`px-4 py-2 text-sm font-medium rounded-xl border transition ${
              activePage === p.key
                ? 'border-evangile-600/60 bg-evangile-600/10 text-evangile-500'
                : 'border-line text-muted hover:border-evangile-600/30 hover:text-evangile-500'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Sections */}
      {contents.length === 0 && !loading && (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-muted">Aucun contenu pour cette page.</p>
        </div>
      )}

      <div className="space-y-4">
        {Array.from(sections.entries()).map(([sectionKey, items]) => {
          const isOpen = openSections.has(sectionKey);
          const isSaving = savingSections.has(sectionKey);
          const dirty = isSectionDirty(sectionKey);

          return (
            <div key={sectionKey} className="glass rounded-2xl p-6">
              {/* Section header */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleSection(sectionKey)}
                  className="flex items-center gap-2 flex-1 text-left transition hover:opacity-80"
                >
                  {isOpen ? (
                    <ChevronDown size={16} className="text-muted" />
                  ) : (
                    <ChevronRight size={16} className="text-muted" />
                  )}
                  <span className="font-serif text-lg font-semibold text-cream">
                    {sectionKey}
                  </span>
                  <span className="text-xs text-muted">
                    {items.length} champ{items.length !== 1 ? 's' : ''}
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAddModal({ sectionKey });
                      setNewFieldKey('');
                      setNewFieldLabel('');
                      setNewFieldType('text');
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-evangile-600/40 hover:text-evangile-500 transition"
                    title="Ajouter un champ"
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveSection(sectionKey)}
                    disabled={isSaving}
                    className="btn-gold inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {isSaving ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    Sauvegarder cette section
                    {dirty && (
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                        modifié
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Fields */}
              {isOpen && (
                <div className="mt-5 space-y-5">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition ${
                        (draftValues[item.id] ?? item.value) !== item.value ||
                        (draftActive[item.id] ?? item.is_active) !== item.is_active
                          ? 'border-evangile-600/30 bg-evangile-600/5'
                          : 'border-line/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <label className="text-xs font-medium text-muted truncate">
                            {item.label}
                          </label>
                          <span className="rounded-full bg-evangile-600/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-evangile-500 shrink-0">
                            {item.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={draftActive[item.id] ?? item.is_active}
                              onChange={(e) =>
                                handleActiveToggle(item.id, e.target.checked)
                              }
                              className="h-3.5 w-3.5 rounded border-line accent-evangile-600"
                            />
                            <span className="text-[10px] text-muted">Actif</span>
                          </label>

                          {deleteConfirmId === item.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => void handleDeleteField(item.id)}
                                className="text-xs text-red-400 hover:text-red-300 transition px-2 py-1"
                              >
                                Confirmer
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="text-xs text-muted hover:text-cream transition px-2 py-1"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:text-red-400 hover:bg-red-400/10 transition"
                              title="Supprimer ce champ"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-muted mb-1.5">
                        field_key: <code className="text-evangile-500/70">{item.field_key}</code>
                      </div>

                      {renderInput(item)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add field modal */}
      {renderAddModal()}
    </div>
  );
}