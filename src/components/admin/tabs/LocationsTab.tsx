import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import type { Location } from '../../../types';
import { Plus, Trash2, Save, X, Edit3, Loader2, Star, MapPin } from 'lucide-react';

interface LocationForm {
  name: string;
  address: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  phone: string;
  email: string;
  service_times: string;
  pastor_name: string;
  is_main: boolean;
  is_active: boolean;
  sort_order: string;
}

const emptyForm: LocationForm = {
  name: '', address: '', city: '', country: 'RDC',
  latitude: '', longitude: '', phone: '', email: '',
  service_times: '', pastor_name: '', is_main: false,
  is_active: true, sort_order: '0',
};

export function LocationsTab() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LocationForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('locations').select('*').order('sort_order');
    if (!error && data) setLocations(data as Location[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLocations(); }, [fetchLocations]);

  function openAdd() { setEditingId(null); setForm(emptyForm); setShowForm(true); }
  function openEdit(loc: Location) {
    setEditingId(loc.id);
    setForm({
      name: loc.name, address: loc.address, city: loc.city, country: loc.country,
      latitude: String(loc.latitude), longitude: String(loc.longitude),
      phone: loc.phone ?? '', email: loc.email ?? '',
      service_times: loc.service_times ?? '', pastor_name: loc.pastor_name ?? '',
      is_main: loc.is_main, is_active: loc.is_active, sort_order: String(loc.sort_order),
    });
    setShowForm(true);
  }
  function closeForm() { setShowForm(false); setEditingId(null); setForm(emptyForm); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name, address: form.address, city: form.city, country: form.country,
      latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude),
      phone: form.phone || null, email: form.email || null,
      service_times: form.service_times || null, pastor_name: form.pastor_name || null,
      is_main: form.is_main, is_active: form.is_active,
      sort_order: parseInt(form.sort_order, 10) || 0,
    };
    try {
      if (form.is_main) await supabase.from('locations').update({ is_main: false }).neq('id', editingId ?? '');
      if (editingId) {
        const { error } = await supabase.from('locations').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('locations').insert(payload);
        if (error) throw error;
      }
      addToast(editingId ? 'Lieu modifié' : 'Lieu ajouté', 'success');
      await fetchLocations();
      closeForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      addToast(msg, 'error');
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer "${name}" ?`)) return;
    const { error } = await supabase.from('locations').delete().eq('id', id);
    if (error) { addToast(error.message, 'error'); return; }
    addToast('Lieu supprimé', 'success');
    await fetchLocations();
  }

  const f = (field: keyof LocationForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-serif text-2xl font-semibold text-cream">Lieux de culte ({locations.length})</h2>
        <button onClick={openAdd} className="btn-gold text-sm"><Plus className="h-4 w-4" /> Ajouter</button>
      </div>

      {showForm && (
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-serif text-xl font-semibold text-cream">{editingId ? 'Modifier le lieu' : 'Nouveau lieu'}</h3>
            <button onClick={closeForm} className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted hover:text-cream"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="mb-1.5 block text-xs font-medium text-muted">Nom *</label><input type="text" required value={form.name} onChange={f('name')} className="input-surface w-full px-4 py-2.5 text-sm" /></div>
            <div className="sm:col-span-2"><label className="mb-1.5 block text-xs font-medium text-muted">Adresse *</label><input type="text" required value={form.address} onChange={f('address')} className="input-surface w-full px-4 py-2.5 text-sm" /></div>
            <div><label className="mb-1.5 block text-xs font-medium text-muted">Ville *</label><input type="text" required value={form.city} onChange={f('city')} className="input-surface w-full px-4 py-2.5 text-sm" /></div>
            <div><label className="mb-1.5 block text-xs font-medium text-muted">Pays</label><input type="text" value={form.country} onChange={f('country')} className="input-surface w-full px-4 py-2.5 text-sm" /></div>
            <div><label className="mb-1.5 block text-xs font-medium text-muted">Latitude *</label><input type="number" step="any" required value={form.latitude} onChange={f('latitude')} className="input-surface w-full px-4 py-2.5 text-sm" /></div>
            <div><label className="mb-1.5 block text-xs font-medium text-muted">Longitude *</label><input type="number" step="any" required value={form.longitude} onChange={f('longitude')} className="input-surface w-full px-4 py-2.5 text-sm" /></div>
            <div><label className="mb-1.5 block text-xs font-medium text-muted">Téléphone</label><input type="tel" value={form.phone} onChange={f('phone')} className="input-surface w-full px-4 py-2.5 text-sm" /></div>
            <div><label className="mb-1.5 block text-xs font-medium text-muted">Email</label><input type="email" value={form.email} onChange={f('email')} className="input-surface w-full px-4 py-2.5 text-sm" /></div>
            <div><label className="mb-1.5 block text-xs font-medium text-muted">Horaires</label><input type="text" value={form.service_times} onChange={f('service_times')} className="input-surface w-full px-4 py-2.5 text-sm" /></div>
            <div><label className="mb-1.5 block text-xs font-medium text-muted">Pasteur</label><input type="text" value={form.pastor_name} onChange={f('pastor_name')} className="input-surface w-full px-4 py-2.5 text-sm" /></div>
            <div><label className="mb-1.5 block text-xs font-medium text-muted">Ordre</label><input type="number" value={form.sort_order} onChange={f('sort_order')} className="input-surface w-full px-4 py-2.5 text-sm" /></div>
            <div className="flex items-center gap-6 sm:col-span-2 pt-2">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-cream"><input type="checkbox" checked={form.is_main} onChange={(e) => setForm(p => ({ ...p, is_main: e.target.checked }))} className="h-4 w-4 rounded accent-evangile-600" /> Siège principal</label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-cream"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm(p => ({ ...p, is_active: e.target.checked }))} className="h-4 w-4 rounded accent-evangile-600" /> Actif</label>
            </div>
            <div className="flex items-center gap-3 sm:col-span-2 pt-2">
              <button type="submit" disabled={saving} className="btn-gold">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
              <button type="button" onClick={closeForm} className="btn-ghost">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass rounded-2xl h-20 animate-pulse" />)}</div>
      ) : locations.length === 0 ? (
        <div className="rounded-2xl border border-line p-10 text-center text-muted"><MapPin className="mx-auto mb-3 h-8 w-8 opacity-40" /><p>Aucun lieu enregistré.</p></div>
      ) : (
        <div className="flex flex-col gap-3">
          {locations.map((loc) => (
            <div key={loc.id} className="glass rounded-2xl p-4 flex items-start justify-between gap-4 transition hover:scale-[1.005]">
              <div className="flex items-start gap-3">
                <Star className={`mt-0.5 h-5 w-5 shrink-0 ${loc.is_main ? 'text-evangile-500' : 'text-ember-400'}`} />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-cream">{loc.name}</p>
                    {loc.is_main && <span className="rounded-full bg-evangile-600/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-evangile-500">Principal</span>}
                    {!loc.is_active && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted">Inactif</span>}
                  </div>
                  <p className="text-sm text-muted">{loc.address}, {loc.city}</p>
                  <p className="text-xs text-muted/60">GPS: {loc.latitude}, {loc.longitude}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button onClick={() => openEdit(loc)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-evangile-600/40 hover:text-evangile-500 transition"><Edit3 className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(loc.id, loc.name)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted hover:border-ember-500/40 hover:text-ember-400 transition"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}