/* ═══════════════════════════════════════════════════════════════════
   Multi-Step Public Signup Form
   High-contrast, theme-aware via CSS classes
   Église Évangélique La Conquête
   ═══════════════════════════════════════════════════════════════════ */
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import {
  Mail, Lock, User, Phone, ArrowRight, ChevronLeft,
  Check, Eye, EyeOff, Sparkles, Loader2, Users, MapPin,
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
  { label: 'Statut', icon: Users },
] as const;

/* ─── Shared style ──────────────────────────────────────────── */
const FONT_BODY = { fontFamily: "'Inter', sans-serif" };
const FONT_DISPLAY = { fontFamily: "'Cormorant Garamond', serif" };

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

  /* ── Step 2: Church status + department ──────────────────── */
  const [churchStatus, setChurchStatus] = useState<'member' | 'visitor' | 'seeker' | ''>('');
  const [departments, setDepartments] = useState<{ id: string; name: string; slug: string; icon_name: string; description: string }[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
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
          emailRedirectTo: `${window.location.origin}${window.location.pathname}#connexion`,
          data: {
            full_name: fullName.trim(),
            phone: phone.trim() || undefined,
            gender: gender || undefined,
            church_status: churchStatus || 'visitor',
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          addToast('Cette adresse email est déjà utilisée. Connectez-vous plutôt.', 'error');
        } else {
          addToast(error.message, 'error');
        }
        return;
      }

      if (data.user) {
        // Upsert profile
        const baseProfileData: Record<string, any> = {
          id: data.user.id,
          email: email.trim(),
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          gender: gender || null,
        };

        const { error: err1 } = await supabase
          .from('user_profiles')
          .upsert({ ...baseProfileData, onboarding_completed: true }, { onConflict: 'id' });

        if (err1 && (err1.message.includes('does not exist') || err1.code === '42703')) {
          await supabase
            .from('user_profiles')
            .upsert(baseProfileData, { onConflict: 'id' })
            .catch(() => {});
        }

        // If member, join department
        if (churchStatus === 'member' && selectedDept) {
          await supabase
            .from('department_members')
            .upsert({
              user_id: data.user.id,
              department_id: selectedDept,
            }, { onConflict: 'user_id,department_id' })
            .catch(() => {});
        }

        if (data.session) {
          addToast('Compte créé avec succès !', 'success');
        } else {
          addToast('Compte créé ! Vérifiez votre email pour confirmer votre inscription.', 'success');
        }
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
                    ? 'bg-red-500 border-red-500 text-white'
                    : isActive
                      ? 'border-red-400 text-red-400'
                      : 'auth-tab'
                }`}>
                  {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className="auth-text-muted text-xs font-medium" style={FONT_BODY}>{s.label}</span>
              </button>
            );
          })}
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ── Step 0: Account ───────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-4">
          <h3 className="auth-text-heading text-xl font-bold text-center mb-6" style={FONT_DISPLAY}>
            Créez votre compte
          </h3>
          <div>
            <label className="auth-label block text-sm font-medium mb-1.5" style={FONT_BODY}>Adresse email</label>
            <div className="relative">
              <Mail className="auth-icon absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="auth-input w-full pl-11 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
                style={FONT_BODY} />
            </div>
          </div>
          <div>
            <label className="auth-label block text-sm font-medium mb-1.5" style={FONT_BODY}>Mot de passe</label>
            <div className="relative">
              <Lock className="auth-icon absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
                className="auth-input w-full pl-11 pr-12 py-3 rounded-xl border text-sm outline-none transition-all"
                style={FONT_BODY} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="auth-icon absolute right-3 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="auth-label block text-sm font-medium mb-1.5" style={FONT_BODY}>Confirmer le mot de passe</label>
            <div className="relative">
              <Lock className="auth-icon absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" />
              <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirmez votre mot de passe"
                className="auth-input w-full pl-11 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
                style={FONT_BODY} />
            </div>
          </div>
        </div>
      )}

      {/* ── Step 1: Profile ───────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="auth-text-heading text-xl font-bold text-center mb-6" style={FONT_DISPLAY}>
            Parlez-nous de vous
          </h3>
          <div>
            <label className="auth-label block text-sm font-medium mb-1.5" style={FONT_BODY}>Nom complet *</label>
            <div className="relative">
              <User className="auth-icon absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" />
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Prénom et nom"
                className="auth-input w-full pl-11 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
                style={FONT_BODY} />
            </div>
          </div>
          <div>
            <label className="auth-label block text-sm font-medium mb-1.5" style={FONT_BODY}>Téléphone</label>
            <div className="relative">
              <Phone className="auth-icon absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" />
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+243 ..."
                className="auth-input w-full pl-11 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
                style={FONT_BODY} />
            </div>
          </div>
          <div>
            <label className="auth-label block text-sm font-medium mb-1.5" style={FONT_BODY}>Genre</label>
            <div className="flex gap-3">
              {(['homme', 'femme'] as const).map(g => (
                <button key={g} onClick={() => setGender(gender === g ? '' : g)}
                  className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                    gender === g ? 'auth-tab-active' : 'auth-tab hover:opacity-80'
                  }`} style={FONT_BODY}>
                  {g === 'homme' ? 'Homme' : 'Femme'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Church status + department ────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          <h3 className="auth-text-heading text-xl font-bold text-center mb-2" style={FONT_DISPLAY}>
            Votre situation
          </h3>
          <p className="auth-text-muted text-sm text-center mb-4" style={FONT_BODY}>
            Comment décririez-vous votre relation avec l'église ?
          </p>

          {/* Status selection */}
          <div className="space-y-2">
            {([
              { value: 'member', label: 'Je suis membre', desc: "J'ai déjà rejoint l'église" },
              { value: 'visitor', label: 'Je suis visiteur', desc: "C'est ma première fois" },
              { value: 'seeker', label: 'Je cherche à en savoir plus', desc: 'Je souhaite découvrir la foi' },
            ] as const).map(opt => (
              <button key={opt.value} type="button"
                onClick={() => setChurchStatus(churchStatus === opt.value ? '' : opt.value)}
                className={`w-full p-4 rounded-xl border text-left transition-all duration-200 relative cursor-pointer ${
                  churchStatus === opt.value ? 'auth-tab-active' : 'auth-tab hover:opacity-80'
                }`}>
                <div className="text-sm font-semibold auth-text-heading" style={FONT_BODY}>{opt.label}</div>
                <div className="auth-text-muted text-xs mt-0.5" style={FONT_BODY}>{opt.desc}</div>
                {churchStatus === opt.value && (
                  <Check className="w-4 h-4 text-red-400 absolute top-4 right-4" />
                )}
              </button>
            ))}
          </div>

          {/* Department selection (members only) */}
          {churchStatus === 'member' && (
            <div className="mt-4">
              <label className="auth-label flex items-center gap-2 text-sm font-medium mb-3" style={FONT_BODY}>
                <MapPin className="w-4 h-4 auth-icon" />
                Votre département
              </label>
              {loadingDepts ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 text-red-400 animate-spin" />
                </div>
              ) : departments.length > 0 ? (
                <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
                  className="auth-input w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all cursor-pointer"
                  style={FONT_BODY}>
                  <option value="">Sélectionnez un département (optionnel)</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              ) : (
                <p className="auth-text-muted text-xs">Aucun département disponible</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Navigation buttons ────────────────────────────── */}
      <div className="flex gap-3 mt-8">
        {step > 0 && (
          <button onClick={back}
            className="auth-tab flex items-center justify-center gap-2 px-4 py-3 rounded-xl border
              transition-all cursor-pointer text-sm" style={FONT_BODY}>
            <ChevronLeft className="w-4 h-4" />
            Retour
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button onClick={next}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5
              bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl
              hover:from-red-600 hover:to-red-700 active:scale-[0.98]
              transition-all duration-200 shadow-lg shadow-red-500/20
              text-sm cursor-pointer" style={FONT_BODY}>
            Continuer <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5
              bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl
              hover:from-red-600 hover:to-red-700 active:scale-[0.98]
              transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg shadow-red-500/20
              text-sm cursor-pointer" style={FONT_BODY}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <><Sparkles className="w-4 h-4" /> Créer mon compte</>
            )}
          </button>
        )}
      </div>

      {/* ── Switch to login ───────────────────────────────── */}
      <p className="auth-text-muted text-center text-sm mt-6" style={FONT_BODY}>
        Déjà membre ?{' '}
        <button onClick={onSwitchToLogin} className="auth-text-link font-medium transition-colors cursor-pointer">
          Se connecter
        </button>
      </p>
    </div>
  );
}