/* ═══════════════════════════════════════════════════════════════════
   Multi-Step Public Signup Form
   Église Évangélique La Conquête
   ═══════════════════════════════════════════════════════════════════ */
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import {
  Mail, Lock, User, Phone, ArrowRight, ChevronLeft,
  Check, Eye, EyeOff, Sparkles, Loader2,
} from '../../lib/icons';

/* ─── Props ─────────────────────────────────────────────────── */
interface SignupFormProps {
  onComplete?: () => void;
  onSwitchToLogin: () => void;
}

/* ─── Step definitions ──────────────────────────────────────── */
const STEPS = [
  { label: 'Compte', icon: Mail },
  { label: 'Profil', icon: User },
  { label: 'Interêts', icon: Sparkles },
] as const;

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */
export function SignupForm({ onComplete, onSwitchToLogin }: SignupFormProps) {
  const { addToast } = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  /* ── Step 0: Account ─────────────────────────────────────── */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  /* ── Step 1: Profile ─────────────────────────────────────── */
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'homme' | 'femme' | ''>('');
  const [joinedVia, setJoinedVia] = useState('');

  /* ── Step 2: Interests (departments) ─────────────────────── */
  const [departments, setDepartments] = useState<{ id: string; name: string; slug: string; icon_name: string; description: string }[]>([]);
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set());
  const [loadingDepts, setLoadingDepts] = useState(false);

  /* ── Load departments on step 2 ──────────────────────────── */
  useEffect(() => {
    if (step === 2 && departments.length === 0) {
      setLoadingDepts(true);
      supabase.from('departments')
        .select('id, name, slug, icon_name, description')
        .eq('is_active', true)
        .order('sort_order')
        .then(({ data }) => {
          if (data) setDepartments(data as typeof departments);
        })
        .catch(() => {})
        .finally(() => setLoadingDepts(false));
    }
  }, [step, departments.length]);

  /* ── Toggle department ───────────────────────────────────── */
  const toggleDept = (id: string) => {
    setSelectedDepts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Validation ──────────────────────────────────────────── */
  const validateStep = (): boolean => {
    if (step === 0) {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        addToast('Veuillez entrer une adresse email valide.', 'error');
        return false;
      }
      if (password.length < 6) {
        addToast('Le mot de passe doit contenir au moins 6 caractères.', 'error');
        return false;
      }
      if (password !== confirmPassword) {
        addToast('Les mots de passe ne correspondent pas.', 'error');
        return false;
      }
      return true;
    }
    if (step === 1) {
      if (!fullName.trim()) {
        addToast('Veuillez entrer votre nom complet.', 'error');
        return false;
      }
      return true;
    }
    return true;
  };

  /* ── Next / Back ─────────────────────────────────────────── */
  const next = () => {
    if (!validateStep()) return;
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep(s => Math.max(s - 1, 0));

  /* ── Submit (final step) ─────────────────────────────────── */
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim() || undefined,
            gender: gender || undefined,
            joined_via: joinedVia || 'website',
            interested_departments: Array.from(selectedDepts),
          },
        },
      });

      if (error) {
        addToast(error.message, 'error');
        return;
      }

      if (data.user) {
        // Update profile with additional info
        await supabase.from('user_profiles').update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          gender: gender || null,
          joined_via: joinedVia || 'website',
        }).eq('id', data.user.id);

        addToast('Compte créé avec succès ! Vérifiez votre email.', 'success');
        onComplete?.();
      }
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Erreur lors de l'inscription.", 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* ── Progress bar ─────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <button
                key={i}
                onClick={() => i < step && setStep(i)}
                className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                  isActive ? 'opacity-100 scale-110' : isDone ? 'opacity-80 cursor-pointer hover:opacity-100' : 'opacity-40'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isDone
                    ? 'bg-gold border-gold text-ink'
                    : isActive
                      ? 'border-gold text-gold'
                      : 'border-white/20 text-white/40'
                }`}>
                  {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className="text-xs font-medium text-white/60">{s.label}</span>
              </button>
            );
          })}
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold to-ember rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ── Step content ─────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-cream text-center mb-6">
            Créez votre compte
          </h3>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Adresse email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-cream placeholder:text-white/30 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
                className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-cream placeholder:text-white/30 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Confirmer le mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirmez votre mot de passe"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-cream placeholder:text-white/30 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all" />
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-cream text-center mb-6">
            Parlez-nous de vous
          </h3>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Nom complet *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Prénom et nom"
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-cream placeholder:text-white/30 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Téléphone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+243 ..."
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-cream placeholder:text-white/30 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Genre</label>
            <div className="flex gap-3">
              {(['homme', 'femme'] as const).map(g => (
                <button key={g} onClick={() => setGender(gender === g ? '' : g)}
                  className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                    gender === g ? 'border-gold bg-gold/10 text-gold' : 'border-white/10 text-white/50 hover:border-white/30'
                  }`}>
                  {g === 'homme' ? 'Homme' : 'Femme'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">Comment nous avez-vous connus ?</label>
            <select value={joinedVia} onChange={e => setJoinedVia(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-cream focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all">
              <option value="">Sélectionnez...</option>
              <option value="word_of_mouth">Bouche-à-oreille</option>
              <option value="social_media">Réseaux sociaux</option>
              <option value="event">Un événement</option>
              <option value="website">Site web</option>
              <option value="invitation">Invitation personnelle</option>
              <option value="other">Autre</option>
            </select>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-cream text-center mb-2">
            Vos centres d'intérêt
          </h3>
          <p className="text-sm text-white/50 text-center mb-6">
            Sélectionnez les départements qui vous intéressent.
          </p>
          {loadingDepts ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 text-gold animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {departments.map(dept => {
                const isSelected = selectedDepts.has(dept.id);
                return (
                  <button key={dept.id} onClick={() => toggleDept(dept.id)}
                    className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                      isSelected ? 'border-gold bg-gold/10' : 'border-white/10 hover:border-white/30'
                    }`}>
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-sm font-semibold text-cream">{dept.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-gold flex-shrink-0 ml-1" />}
                    </div>
                    <p className="text-xs text-white/40 line-clamp-2">{dept.description}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Navigation buttons ────────────────────────────── */}
      <div className="flex gap-3 mt-8">
        {step > 0 && (
          <button onClick={back}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white/90 hover:border-white/30 transition-all">
            <ChevronLeft className="w-4 h-4" />
            Retour
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button onClick={next}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-gold to-ember text-ink font-semibold rounded-xl hover:opacity-90 transition-opacity">
            Continuer <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-gold to-ember text-ink font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <><Sparkles className="w-4 h-4" /> Créer mon compte</>
            )}
          </button>
        )}
      </div>

      {/* ── Switch to login ───────────────────────────────── */}
      <p className="text-center text-sm text-white/40 mt-6">
        Déjà membre ?{' '}
        <button onClick={onSwitchToLogin} className="text-gold hover:underline font-medium">
          Se connecter
        </button>
      </p>
    </div>
  );
}