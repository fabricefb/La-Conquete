import { useState, useEffect, useCallback } from 'react';
import { db } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import type { InventoryItem, InventoryReservation, ChurchEvent, UserProfile } from '../../../types';
import { Plus, Trash2, Save, X, Edit3, Loader2, Search, Package } from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES: InventoryItem['category'][] = [
  'sound', 'seating', 'lighting', 'literature', 'generators', 'tents', 'vehicles', 'other',
];

const CATEGORY_LABELS: Record<InventoryItem['category'], string> = {
  sound: 'Sonorisation',
  seating: 'Assises',
  lighting: 'Éclairage',
  literature: 'Littérature',
  generators: 'Générateurs',
  tents: 'Tentes',
  vehicles: 'Véhicules',
  other: 'Autre',
};

const CONDITIONS: InventoryItem['condition'][] = [
  'excellent', 'good', 'fair', 'needs_repair', 'retired',
];

const CONDITION_LABELS: Record<InventoryItem['condition'], string> = {
  excellent: 'Excellent',
  good: 'Bon',
  fair: 'Correct',
  needs_repair: 'À réparer',
  retired: 'Retiré',
};

const CONDITION_COLORS: Record<InventoryItem['condition'], string> = {
  excellent: 'bg-green-500/20 text-green-400',
  good: 'bg-emerald-500/20 text-emerald-400',
  fair: 'bg-yellow-500/20 text-yellow-400',
  needs_repair: 'bg-red-500/20 text-red-400',
  retired: 'bg-gray-500/20 text-gray-400',
};

const CONDITION_BAR_COLORS: Record<InventoryItem['condition'], string> = {
  excellent: 'bg-green-500',
  good: 'bg-emerald-500',
  fair: 'bg-yellow-500',
  needs_repair: 'bg-red-500',
  retired: 'bg-gray-500',
};

const RESERVATION_STATUS_LABELS: Record<InventoryReservation['status'], string> = {
  pending: 'En attente',
  approved: 'Approuvée',
  active: 'Active',
  returned: 'Retournée',
  overdue: 'En retard',
};

const RESERVATION_STATUS_COLORS: Record<InventoryReservation['status'], string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-blue-500/20 text-blue-400',
  active: 'bg-green-500/20 text-green-400',
  returned: 'bg-gray-500/20 text-gray-400',
  overdue: 'bg-red-500/20 text-red-400',
};

// ---------------------------------------------------------------------------
// Form type
// ---------------------------------------------------------------------------

type ItemFormData = Partial<InventoryItem> & Pick<InventoryItem, 'name' | 'category' | 'quantity_total' | 'quantity_available' | 'condition'>;

const EMPTY_FORM: ItemFormData = {
  name: '',
  category: 'other',
  description: '',
  quantity_total: 1,
  quantity_available: 1,
  condition: 'good',
  location_stored: '',
  image_url: '',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InventoryTab() {
  const { addToast } = useToast();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<InventoryItem['category'] | ''>('');

  // Form
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemFormData>(EMPTY_FORM);

  // Reservations sub-section
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [reservations, setReservations] = useState<InventoryReservation[]>([]);
  const [resLoading, setResLoading] = useState(false);

  // Reservation form
  const [resFormOpen, setResFormOpen] = useState(false);
  const [resForm, setResForm] = useState({
    event_id: '',
    quantity_reserved: 1,
    reserved_date: '',
    return_date: '',
    notes: '',
  });

  // ---- fetch ---------------------------------------------------------------

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db.getInventoryItems(categoryFilter || undefined);
      setItems(data);
    } catch {
      addToast('Erreur lors du chargement de l\'inventaire', 'error');
    }
    setLoading(false);
  }, [addToast, categoryFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const fetchReservations = useCallback(async (itemId: string) => {
    setResLoading(true);
    try {
      const data = await db.getInventoryReservations(itemId);
      setReservations(data);
    } catch {
      addToast('Erreur lors du chargement des réservations', 'error');
    }
    setResLoading(false);
  }, [addToast]);

  useEffect(() => {
    if (selectedItemId) {
      fetchReservations(selectedItemId);
    } else {
      setReservations([]);
    }
  }, [selectedItemId, fetchReservations]);

  // ---- filtered items ------------------------------------------------------

  const filteredItems = items.filter((item) => {
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !(item.description || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ---- form helpers --------------------------------------------------------

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      description: item.description || '',
      quantity_total: item.quantity_total,
      quantity_available: item.quantity_available,
      condition: item.condition,
      location_stored: item.location_stored || '',
      image_url: item.image_url || '',
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleField = (field: keyof ItemFormData, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ---- save item -----------------------------------------------------------

  const handleSave = async () => {
    if (!form.name.trim()) {
      addToast('Le nom est obligatoire', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await db.upsertInventoryItem({ ...form, id: editingId });
        addToast('Article mis à jour', 'success');
      } else {
        await db.upsertInventoryItem({
          ...form,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        addToast('Article créé avec succès', 'success');
      }
      closeForm();
      fetchItems();
    } catch {
      addToast('Erreur lors de l\'enregistrement', 'error');
    }
    setSaving(false);
  };

  // ---- delete item ---------------------------------------------------------

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cet article ?')) return;
    try {
      await db.deleteInventoryItem(id);
      addToast('Article supprimé', 'success');
      if (selectedItemId === id) setSelectedItemId(null);
      fetchItems();
    } catch {
      addToast('Erreur lors de la suppression', 'error');
    }
  };

  // ---- save reservation ----------------------------------------------------

  const handleSaveReservation = async () => {
    if (!selectedItemId || !resForm.event_id || resForm.quantity_reserved < 1) {
      addToast('Veuillez remplir tous les champs obligatoires', 'error');
      return;
    }
    setSaving(true);
    try {
      await db.upsertInventoryReservation({
        item_id: selectedItemId,
        event_id: resForm.event_id,
        quantity_reserved: resForm.quantity_reserved,
        reserved_date: resForm.reserved_date || new Date().toISOString(),
        return_date: resForm.return_date || undefined,
        notes: resForm.notes || undefined,
        status: 'pending',
        reserved_by: '',
        created_at: new Date().toISOString(),
      });
      addToast('Réservation ajoutée', 'success');
      setResFormOpen(false);
      setResForm({ event_id: '', quantity_reserved: 1, reserved_date: '', return_date: '', notes: '' });
      fetchReservations(selectedItemId);
    } catch {
      addToast('Erreur lors de la réservation', 'error');
    }
    setSaving(false);
  };

  // ---- render --------------------------------------------------------------

  const selectedItem = items.find((i) => i.id === selectedItemId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-serif text-2xl font-semibold text-cream">
          Inventaire
        </h2>
        <button onClick={openCreate} className="btn-gold flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un article
        </button>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un article..."
            className="input-surface w-full pl-10 pr-4 py-2.5 text-sm"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as InventoryItem['category'] | '')}
          className="input-surface px-4 py-2.5 text-sm"
        >
          <option value="">Toutes catégories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </div>

      {/* Add/Edit form */}
      {formOpen && (
        <div className="glass rounded-2xl p-6 space-y-4 border border-evangile-600/20">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-cream">
              {editingId ? 'Modifier l\'article' : 'Nouvel article'}
            </h3>
            <button onClick={closeForm} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-cream transition">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Nom <span className="text-red-400">*</span></label>
              <input type="text" value={form.name} onChange={(e) => handleField('name', e.target.value)} className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Catégorie</label>
              <select value={form.category} onChange={(e) => handleField('category', e.target.value)} className="input-surface w-full px-4 py-2.5 text-sm">
                {CATEGORIES.map((c) => (<option key={c} value={c}>{CATEGORY_LABELS[c]}</option>))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Quantité totale</label>
              <input type="number" min={0} value={form.quantity_total} onChange={(e) => handleField('quantity_total', parseInt(e.target.value) || 0)} className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Quantité disponible</label>
              <input type="number" min={0} value={form.quantity_available} onChange={(e) => handleField('quantity_available', parseInt(e.target.value) || 0)} className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">État</label>
              <select value={form.condition} onChange={(e) => handleField('condition', e.target.value)} className="input-surface w-full px-4 py-2.5 text-sm">
                {CONDITIONS.map((c) => (<option key={c} value={c}>{CONDITION_LABELS[c]}</option>))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Lieu de stockage</label>
              <input type="text" value={form.location_stored || ''} onChange={(e) => handleField('location_stored', e.target.value)} className="input-surface w-full px-4 py-2.5 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted">Description</label>
              <textarea rows={2} value={form.description || ''} onChange={(e) => handleField('description', e.target.value)} className="input-surface w-full px-4 py-2.5 text-sm resize-none" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted">URL de l'image</label>
              <input type="text" value={form.image_url || ''} onChange={(e) => handleField('image_url', e.target.value)} className="input-surface w-full px-4 py-2.5 text-sm" placeholder="https://..." />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button onClick={closeForm} className="btn-ghost flex items-center gap-2"><X className="h-4 w-4" /> Annuler</button>
            <button onClick={handleSave} disabled={saving} className="btn-gold flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingId ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </div>
      )}

      {/* Items list */}
      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-evangile-500" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Package className="mx-auto h-8 w-8 text-muted mb-3" />
          <p className="text-muted text-sm">Aucun article trouvé.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)}
              className={`glass rounded-2xl p-4 cursor-pointer transition-all group ${
                selectedItemId === item.id ? 'border border-evangile-600/50 ring-1 ring-evangile-600/20' : 'hover:bg-white/5'
              }`}
            >
              <div className="flex gap-3">
                {/* Thumbnail */}
                <div className="h-16 w-16 flex-shrink-0 rounded-xl overflow-hidden bg-white/5">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Package className="h-6 w-6 text-muted" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-serif text-sm font-semibold text-cream truncate">{item.name}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${CONDITION_COLORS[item.condition]}`}>
                          {CONDITION_LABELS[item.condition]}
                        </span>
                        <span className="text-[10px] text-muted uppercase tracking-widest">{CATEGORY_LABELS[item.category]}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-evangile-600/40 hover:text-evangile-500 transition"
                        title="Modifier"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted hover:border-red-400/40 hover:text-red-400 transition"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Stock bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] text-muted mb-1">
                      <span>Stock: {item.quantity_available}/{item.quantity_total}</span>
                      <span>{item.quantity_total > 0 ? Math.round((item.quantity_available / item.quantity_total) * 100) : 0}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${CONDITION_BAR_COLORS[item.condition]}`}
                        style={{ width: `${item.quantity_total > 0 ? (item.quantity_available / item.quantity_total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {item.location_stored && (
                    <p className="mt-1 text-[10px] text-muted">📍 {item.location_stored}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reservations sub-section */}
      {selectedItemId && selectedItem && (
        <div className="glass rounded-2xl p-6 space-y-4 border border-evangile-600/20">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-serif text-lg font-semibold text-cream">
              Réservations — {selectedItem.name}
            </h3>
            <button
              onClick={() => setResFormOpen((o) => !o)}
              className="btn-gold flex items-center gap-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              Réserver
            </button>
          </div>

          {/* Reservation form */}
          {resFormOpen && (
            <div className="border border-line rounded-xl p-4 space-y-3 bg-white/5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Événement <span className="text-red-400">*</span></label>
                  <ResEventSelect value={resForm.event_id} onChange={(v) => setResForm((p) => ({ ...p, event_id: v }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Quantité</label>
                  <input type="number" min={1} max={selectedItem.quantity_available} value={resForm.quantity_reserved} onChange={(e) => setResForm((p) => ({ ...p, quantity_reserved: parseInt(e.target.value) || 1 }))} className="input-surface w-full px-4 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Date de retour</label>
                  <input type="date" value={resForm.return_date} onChange={(e) => setResForm((p) => ({ ...p, return_date: e.target.value }))} className="input-surface w-full px-4 py-2.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Notes</label>
                <input type="text" value={resForm.notes} onChange={(e) => setResForm((p) => ({ ...p, notes: e.target.value }))} className="input-surface w-full px-4 py-2.5 text-sm" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setResFormOpen(false)} className="btn-ghost text-sm">Annuler</button>
                <button onClick={handleSaveReservation} disabled={saving} className="btn-gold flex items-center gap-2 text-sm disabled:opacity-50">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Réserver
                </button>
              </div>
            </div>
          )}

          {/* Reservations list */}
          {resLoading ? (
            <div className="text-center py-4"><Loader2 className="mx-auto h-5 w-5 animate-spin text-evangile-500" /></div>
          ) : reservations.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">Aucune réservation pour cet article.</p>
          ) : (
            <div className="space-y-2">
              {reservations.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-cream truncate">{r.event_title || r.event_id}</p>
                    <p className="text-[10px] text-muted">
                      Qté: {r.quantity_reserved} · {new Date(r.reserved_date).toLocaleDateString('fr-FR')}
                      {r.return_date && ` → ${new Date(r.return_date).toLocaleDateString('fr-FR')}`}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest flex-shrink-0 ${RESERVATION_STATUS_COLORS[r.status]}`}>
                    {RESERVATION_STATUS_LABELS[r.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event select (lazy fetch)
// ---------------------------------------------------------------------------

function ResEventSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [events, setEvents] = useState<ChurchEvent[]>([]);

  useEffect(() => {
    db.getEvents().then(setEvents).catch(() => {});
  }, []);

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="input-surface w-full px-4 py-2.5 text-sm">
      <option value="">— Choisir un événement —</option>
      {events.map((ev) => (
        <option key={ev.id} value={ev.id}>{ev.title}</option>
      ))}
    </select>
  );
}