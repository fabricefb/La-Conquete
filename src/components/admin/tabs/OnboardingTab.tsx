import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { Loader2, ClipboardList, User, Phone, Calendar, Building2, FileText } from 'lucide-react';

interface OnboardingAnswer {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  gender: string | null;
  birth_date: string | null;
  department_id: string | null;
  department_name: string | null;
  position_id: string | null;
  position_name: string | null;
  motivation: string | null;
  created_at: string;
  user_email?: string;
}

export function OnboardingTab() {
  const { addToast } = useToast();
  const [answers, setAnswers] = useState<OnboardingAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<OnboardingAnswer | null>(null);

  const fetchAnswers = useCallback(async () => {
    setLoading(true);
    try {
      // Try fetching from onboarding_answers table
      const { data, error } = await supabase
        .from('onboarding_answers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist yet — show message
        if (error.message.includes('does not exist')) {
          addToast('La table onboarding_answers n\'existe pas encore. Exécutez la migration SQL.', 'info');
          setAnswers([]);
        } else {
          addToast('Erreur lors du chargement', 'error');
        }
      } else {
        // Enrich with user emails — bulk fetch instead of N+1
        const rows = (data as OnboardingAnswer[]) ?? [];
        const userIds = [...new Set(rows.map(a => a.user_id))];
        let emailMap: Record<string, string> = {};
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('id, email')
            .in('id', userIds);
          if (profiles) {
            emailMap = Object.fromEntries((profiles as any[]).map((p: any) => [p.id, p.email]));
          }
        }
        const enriched = rows.map(a => ({ ...a, user_email: emailMap[a.user_id] || '' }));
        setAnswers(enriched);
      }
    } catch {
      addToast('Erreur de connexion', 'error');
    }
    setLoading(false);
  }, [addToast]);

  useEffect(() => { fetchAnswers(); }, [fetchAnswers]);

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const genderLabel = (g: string | null) => {
    if (!g) return '—';
    const map: Record<string, string> = { homme: 'Homme', femme: 'Femme' };
    return map[g] || g;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-cream">Réponses Onboarding</h2>
          <p className="text-sm text-muted mt-1">{answers.length} réponse(s) enregistrée(s)</p>
        </div>
        <button onClick={fetchAnswers} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-cream transition">
          <ClipboardList className="h-4 w-4" /> Rafraîchir
        </button>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent-400" />
          <p className="text-muted text-sm mt-3">Chargement des réponses...</p>
        </div>
      ) : answers.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <ClipboardList className="mx-auto h-10 w-10 text-muted/30 mb-4" />
          <p className="text-muted">Aucune réponse d'onboarding pour le moment.</p>
          <p className="text-sm text-muted/60 mt-1">Les réponses apparaîtront quand les membres complèteront l'onboarding.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="space-y-2 max-h-[70vh] overflow-y-auto lg:col-span-1">
            {answers.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAnswer(a)}
                className={`w-full text-left glass rounded-xl p-4 transition-all duration-200 ${
                  selectedAnswer?.id === a.id
                    ? 'border-accent-400/40 bg-accent-400/5'
                    : 'hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-400/20 text-accent-400 font-serif text-sm font-bold">
                    {(a.full_name || a.user_email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-cream truncate">
                      {a.full_name || a.user_email || 'Utilisateur'}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {a.department_name || 'Pas de département'}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-muted/60 mt-2">
                  {formatDate(a.created_at)}
                </p>
              </button>
            ))}
          </div>

          {/* Detail */}
          <div className="lg:col-span-2">
            {selectedAnswer ? (
              <div className="glass rounded-2xl p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent-400/20 text-accent-400 font-serif text-2xl font-bold">
                    {(selectedAnswer.full_name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-semibold text-cream">
                      {selectedAnswer.full_name || 'Nom non renseigné'}
                    </h3>
                    <p className="text-sm text-muted">{selectedAnswer.user_email || selectedAnswer.user_id}</p>
                    <p className="text-xs text-muted/60 mt-0.5">{formatDate(selectedAnswer.created_at)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InfoCard icon={<User className="h-4 w-4" />} label="Genre" value={genderLabel(selectedAnswer.gender)} />
                  <InfoCard icon={<Phone className="h-4 w-4" />} label="Téléphone" value={selectedAnswer.phone || '—'} />
                  <InfoCard icon={<Calendar className="h-4 w-4" />} label="Date de naissance" value={selectedAnswer.birth_date ? formatDate(selectedAnswer.birth_date) : '—'} />
                  <InfoCard icon={<Building2 className="h-4 w-4" />} label="Département" value={selectedAnswer.department_name || '—'} />
                  <InfoCard icon={<FileText className="h-4 w-4" />} label="Position" value={selectedAnswer.position_name || '—'} />
                </div>

                {selectedAnswer.motivation && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted">Motivation / Message</label>
                    <div className="rounded-xl bg-white/5 p-4 border-l-2 border-accent-400/30">
                      <p className="text-sm text-cream/80 leading-relaxed">{selectedAnswer.motivation}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass rounded-2xl p-12 text-center">
                <p className="text-muted text-sm">Sélectionnez une réponse pour voir les détails.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-400/10 text-accent-400">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-muted uppercase tracking-widest">{label}</p>
        <p className="text-sm text-cream truncate">{value}</p>
      </div>
    </div>
  );
}