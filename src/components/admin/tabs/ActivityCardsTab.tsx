import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { useAdminAccess } from '../../../contexts/AdminAccessContext';
import ImageUpload from '../ImageUpload';
import {
  Plus, Trash2, Edit3, X, Save, Loader2, GripVertical,
  ChevronUp, ChevronDown, Eye, EyeOff, Image,
  Link2, Type, Hash, ArrowRight,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────

interface ActivityCard {
  id: string;
  card_key: string;
  title: string;
  stat_label: string;
  image_url: string;
  target_page: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CardForm {
  card_key: string;
  title: string;
  stat_label: string;
  image_url: string;
  target_page: string;
  is_active: boolean;
}

const EMPTY_FORM: CardForm = {
  card_key: '',
  title: '',
  stat_label: '',
  image_url: '',
  target_page: '',
  is_active: true,
};

// ─── Target page options ────────────────────────────────────────────

const TARGET_PAGE_OPTIONS = [
  { value: 'predications', label: 'Prédications', tag: '#predications' },
  { value: 'events', label: 'Événements', tag: '' },
  { value: 'departments', label: 'Départements', tag: '' },
  { value: 'media', label: 'Médias', tag: '' },
  { value: 'blog', label: 'Blog / Actualités', tag: '' },
  { value: 'enseignements', label: 'Enseignements', tag: '' },
  { value: 'jeunesse', label: 'Jeunesse', tag: '' },
  { value: 'ministeres', label: 'Ministères', tag: '' },
  { value: 'culte', label: 'Culte & Rassemblements', tag: '' },
  { value: 'about', label: 'À propos', tag: '' },
  { value: 'contact', label: 'Contact', tag: '' },
  { value: 'dons', label: 'Dons', tag: '' },
  { value: 'vision', label: 'Vision & Mission', tag: '' },
  { value: 'pasteurs', label: 'Équipe pastorale', tag: '' },
  { value: 'extensions', label: 'Extensions', tag: '' },
  { value: 'activities', label: 'Activités', tag: '' },
  { value: 'emissions', label: 'Émissions', tag: '' },
  { value: 'communiques', label: 'Communiqués', tag: '' },
  { value: 'annonces', label: 'Annonces', tag: '' },
  { value: 'evangelisation', label: 'Évangélisation', tag: '' },
  { value: 'pastoral', label: 'Espace pastoral', tag: '' },
  { value: 'crm', label: 'CRM', tag: '' },
];

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

export function ActivityCardsTab() {
  const { addToast } = useToast();
  const { isFullAdmin } = useAdminAccess();

  const [cards, setCards] = useState<ActivityCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<CardForm>(EMPTY_FORM);

  // ── Fetch ───────────────────────────────────────────────────────
  const fetchCards = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('activity_cards')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setCards((data ?? []) as ActivityCard[]);
    } catch (err: any) {
      console.error('[ActivityCardsTab] fetch error:', err);
      addToast('Erreur lors du chargement des cartes', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  // ── Helpers ─────────────────────────────────────────────────────
  function openNew() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setIsFormOpen(true);
  }

  function openEdit(card: ActivityCard) {
    setForm({
      card_key: card.card_key,
      title: card.title,
      stat_label: card.stat_label,
      image_url: card.image_url,
      target_page: card.target_page,
      is_active: card.is_active,
    });
    setEditingId(card.id);
    setIsFormOpen(true);
  }

  function getTargetLabel(targetPage: string): string {
    return TARGET_PAGE_OPTIONS.find(o => o.value === targetPage)?.label || targetPage;
  }

  function getTargetTag(targetPage: string): string {
    return TARGET_PAGE_OPTIONS.find(o => o.value === targetPage)?.tag || '';
  }

  // ── Save (insert or update) ─────────────────────────────────────
  async function handleSave() {
    if (!form.card_key.trim()) {
      addToast('La clé de la carte est obligatoire', 'error');
      return;
    }
    if (!form.title.trim()) {
      addToast('Le titre est obligatoire', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        card_key: form.card_key.trim().toLowerCase().replace(/\s+/g, '_'),
        title: form.title.trim(),
        stat_label: form.stat_label.trim(),
        image_url: form.image_url.trim(),
        target_page: form.target_page || 'activities',
        is_active: form.is_active,
        sort_order: editingId
          ? cards.find(c => c.id === editingId)?.sort_order ?? 0
          : cards.length,
      };

      if (editingId) {
        const { error } = await supabase
          .from('activity_cards')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        addToast('Carte mise à jour', 'success');
      } else {
        const { error } = await supabase
          .from('activity_cards')
          .insert(payload);
        if (error) throw error;
        addToast('Carte ajoutée', 'success');
      }
      setIsFormOpen(false);
      await fetchCards();
    } catch (err: any) {
      console.error('[ActivityCardsTab] save error:', err);
      addToast(err.message || 'Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette carte ? Elle sera retirée de la section Explorer.')) return;
    try {
      const { error } = await supabase.from('activity_cards').delete().eq('id', id);
      if (error) throw error;
      addToast('Carte supprimée', 'success');
      await fetchCards();
    } catch (err: any) {
      addToast(err.message || 'Erreur lors de la suppression', 'error');
    }
  }

  // ── Toggle active ───────────────────────────────────────────────
  async function toggleActive(card: ActivityCard) {
    try {
      const { error } = await supabase
        .from('activity_cards')
        .update({ is_active: !card.is_active })
        .eq('id', card.id);
      if (error) throw error;
      await fetchCards();
    } catch (err: any) {
      addToast(err.message || 'Erreur', 'error');
    }
  }

  // ── Reorder ─────────────────────────────────────────────────────
  async function moveOrder(card: ActivityCard, direction: 'up' | 'down') {
    const idx = cards.findIndex(x => x.id === card.id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= cards.length) return;
    const other = cards[swapIdx];
    try {
      await supabase.from('activity_cards').update({ sort_order: other.sort_order }).eq('id', card.id);
      await supabase.from('activity_cards').update({ sort_order: card.sort_order }).eq('id', other.id);
      await fetchCards();
    } catch (err: any) {
      addToast('Erreur de réordonnancement', 'error');
    }
  }

  // ── Render ──────────────────────────────────────────────────────
  if (!isSupabaseConfigured) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
        <p className="text-sm text-red-300">Supabase n'est pas configuré.</p>
        <p className="mt-1 text-xs text-muted">Vérifiez les variables d'environnement.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-cream">
            Cartes Explorer
          </h2>
          <p className="mt-1 text-sm text-muted">
            Gérez les cartes de la section « Découvrez nos activités » sur la page d'accueil.
            Chaque carte a sa propre branche de modification : texte, photo miniature, lien cible.
          </p>
        </div>
        {isFullAdmin && (
          <button onClick={openNew} className="btn-gold inline-flex items-center gap-2 self-start">
            <Plus className="h-4 w-4" /> Ajouter une carte
          </button>
        )}
      </div>

      {/* ── Info bar ── */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs text-muted flex flex-wrap gap-x-4 gap-y-1">
        <span><strong className="text-cream/80">Table :</strong> <code>activity_cards</code></span>
        <span><strong className="text-cream/80">Migration :</strong> <code>20260720000000_sermons_activity_cards.sql</code></span>
        <span><strong className="text-cream/80">Enregistrements :</strong> {cards.length}</span>
        <span><strong className="text-cream/80">Section page :</strong> Explorer (Accueil)</span>
      </div>

      {/* ── Form panel ── */}
      {isFormOpen && (
        <div className="glass rounded-2xl p-6 space-y-5 border border-amber-500/20">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-cream">
              {editingId ? 'Modifier la carte' : 'Nouvelle carte Explorer'}
            </h3>
            <button onClick={() => setIsFormOpen(false)} className="text-muted hover:text-cream transition">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Card Key */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
                <Hash className="h-3 w-3" /> Clé de la carte *
              </label>
              <input
                type="text"
                value={form.card_key}
                onChange={e => setForm(f => ({ ...f, card_key: e.target.value }))}
                placeholder="ex: predications, evenements_speciaux"
                className="input-surface w-full"
                disabled={!!editingId}
              />
              <p className="mt-1 text-[10px] text-white/30">Identifiant unique (auto-minuscule, sans espaces). Non modifiable après création.</p>
            </div>

            {/* Title */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
                <Type className="h-3 w-3" /> Titre affiché *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Prédications"
                className="input-surface w-full"
              />
            </div>

            {/* Stat Label / Description */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
                <Type className="h-3 w-3" /> Sous-titre / Statistique
              </label>
              <input
                type="text"
                value={form.stat_label}
                onChange={e => setForm(f => ({ ...f, stat_label: e.target.value }))}
                placeholder="Ex: 12+ messages, Prochains événements"
                className="input-surface w-full"
              />
              <p className="mt-1 text-[10px] text-white/30">Texte court affiché en badge en haut à droite de la carte.</p>
            </div>

            {/* Target Page */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
                <Link2 className="h-3 w-3" /> Page cible (lien)
              </label>
              <select
                value={form.target_page}
                onChange={e => setForm(f => ({ ...f, target_page: e.target.value }))}
                className="input-surface w-full"
              >
                <option value="">— Sélectionner —</option>
                {TARGET_PAGE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} {opt.tag ? `(${opt.tag})` : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-white/30">La page vers laquelle l'utilisateur est redirigé au clic.</p>
            </div>

            {/* Image / Thumbnail */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted">
                <Image className="h-3 w-3" /> Image miniature (photo de la carte)
              </label>
              <ImageUpload
                value={form.image_url}
                onChange={url => setForm(f => ({ ...f, image_url: url }))}
                folder="activity-cards"
              />
              <p className="mt-1.5 text-[10px] text-white/30">
                Cette image est la miniature affichée sur la section Explorer de la page d'accueil.
                Dimensions recommandées : 800x600px minimum.
              </p>
            </div>

            {/* Toggle active */}
            <div className="sm:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-line bg-white/5 accent-amber-500"
                />
                <div>
                  <span className="text-sm text-cream">Carte active (visible sur le site)</span>
                  <p className="text-[10px] text-white/30">Désactivez pour masquer la carte sans la supprimer.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={() => setIsFormOpen(false)} className="btn-ghost text-sm">Annuler</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-gold inline-flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingId ? 'Mettre à jour' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass animate-pulse rounded-xl p-4 h-24" />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && cards.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center">
          <Image className="h-10 w-10 text-muted/30 mx-auto mb-3" />
          <p className="text-sm text-muted">Aucune carte Explorer. Cliquez sur « Ajouter » pour commencer.</p>
        </div>
      )}

      {/* ── Cards list ── */}
      <div className="space-y-2">
        {cards.map((card) => {
          const targetTag = getTargetTag(card.target_page);

          return (
            <div
              key={card.id}
              className={`glass rounded-xl p-4 transition-all ${!card.is_active ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start gap-3">
                {/* Reorder */}
                {isFullAdmin && (
                  <div className="flex flex-col gap-0.5 pt-1">
                    <button onClick={() => moveOrder(card, 'up')} className="p-0.5 text-muted/40 hover:text-cream transition" title="Monter">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <GripVertical className="h-3.5 w-3.5 text-muted/20" />
                    <button onClick={() => moveOrder(card, 'down')} className="p-0.5 text-muted/40 hover:text-cream transition" title="Descendre">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Thumbnail preview */}
                <div className="h-20 w-28 shrink-0 rounded-lg overflow-hidden bg-navy-800 border border-white/5">
                  {card.image_url ? (
                    <img src={card.image_url} alt={card.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Image className="h-5 w-5 text-muted/30" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {!card.is_active && (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                        Inactive
                      </span>
                    )}
                    {targetTag && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                        <Hash className="h-2.5 w-2.5" />
                        {targetTag.replace('#', '')}
                      </span>
                    )}
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono text-white/40">
                      {card.card_key}
                    </span>
                  </div>
                  <h4 className="mt-1 font-serif text-base font-semibold text-cream truncate">{card.title}</h4>
                  {card.stat_label && (
                    <p className="text-xs text-muted truncate">{card.stat_label}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-muted">
                    <ArrowRight className="h-3 w-3 text-accent-400" />
                    <span>Page cible : <strong className="text-cream/80">{getTargetLabel(card.target_page)}</strong></span>
                  </div>
                </div>

                {/* Actions */}
                {isFullAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleActive(card)}
                      className={`p-2 rounded-lg transition ${card.is_active ? 'text-amber-400 hover:text-amber-300' : 'text-muted/40 hover:text-amber-400'}`}
                      title={card.is_active ? 'Désactiver' : 'Activer'}
                    >
                      {card.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button onClick={() => openEdit(card)} className="p-2 rounded-lg text-muted hover:text-cream transition" title="Modifier">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(card.id)} className="p-2 rounded-lg text-muted hover:text-red-400 transition" title="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Guide section ── */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 space-y-3">
        <h3 className="text-sm font-semibold text-cream flex items-center gap-2">
          <svg className="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
          Guide de modification par branche
        </h3>
        <p className="text-xs text-muted leading-relaxed">
          Chaque carte de la section Explorer possède sa propre branche de modification indépendante.
          Vous pouvez modifier individuellement :
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          <div className="rounded-lg bg-white/[0.03] p-3 border border-white/5">
            <div className="flex items-center gap-2 text-xs font-medium text-cream/80 mb-1">
              <Type className="h-3 w-3 text-amber-400" /> Texte
            </div>
            <p className="text-[11px] text-white/40">Titre et sous-titre (stat_label) propres à chaque carte.</p>
          </div>
          <div className="rounded-lg bg-white/[0.03] p-3 border border-white/5">
            <div className="flex items-center gap-2 text-xs font-medium text-cream/80 mb-1">
              <Image className="h-3 w-3 text-amber-400" /> Photo / Miniature
            </div>
            <p className="text-[11px] text-white/40">Image de la carte, uploadable via R2 ou URL.</p>
          </div>
          <div className="rounded-lg bg-white/[0.03] p-3 border border-white/5">
            <div className="flex items-center gap-2 text-xs font-medium text-cream/80 mb-1">
              <Link2 className="h-3 w-3 text-amber-400" /> Lien
            </div>
            <p className="text-[11px] text-white/40">Page cible vers laquelle la carte redirige au clic.</p>
          </div>
          <div className="rounded-lg bg-white/[0.03] p-3 border border-white/5">
            <div className="flex items-center gap-2 text-xs font-medium text-cream/80 mb-1">
              <Hash className="h-3 w-3 text-amber-400" /> Identification
            </div>
            <p className="text-[11px] text-white/40">Clé unique (card_key) pour savoir quelle carte est modifiée.</p>
          </div>
        </div>
        <p className="text-[11px] text-white/30 mt-2">
          <strong className="text-cream/60">Onglet associé dans Contenus :</strong> Pour modifier le texte
          de la section elle-même (« Découvrez nos activités »), utilisez l'onglet « Contenus » →
          Page d'accueil → Section « explore ». Pour les prédications affichées, utilisez
          l'onglet « Prédications » (#predications).
        </p>
      </div>
    </div>
  );
}