/* ═══════════════════════════════════════════════════════════════════
   OnboardingFlow — Multi-step post-signup onboarding
   Église Évangélique La Conquête
   ═══════════════════════════════════════════════════════════════════ */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { db, supabase } from '../../lib/supabase';
import {
  Users,
  Sparkles,
  Compass,
  ArrowRight,
  ChevronLeft,
  Check,
  CheckCircle2,
} from '../../lib/icons';
import type { LucideIcon } from '../../lib/icons';

/* ═══════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════ */
export function OnboardingFlow() {
  const { profile, user, refreshProfile } = useAuth();
  const { addToast } = useToast();
  const overlayRef = useRef<HTMLDivElement>(null);

  /* ── Step state ─────────────────────────────────────────────── */
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  /* ── Step 1 : Profile ──────────────────────────────────────── */
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'homme' | 'femme' | ''>('');

  /* ── Step 2 : Church status ────────────────────────────────── */
  const [churchStatus, setChurchStatus] = useState<
    'member' | 'visitor' | 'seeker' | ''
  >('');

  /* ── Step 3 : Prayer ───────────────────────────────────────── */
  const [prayerContent, setPrayerContent] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  /* ── Profile completeness detection ──────────────────────── */
  const profileComplete = !!(
    profile?.full_name?.trim() &&
    profile?.phone?.trim() &&
    profile?.gender
  );
  const hasPartialProfileData = !!(
    profile?.full_name?.trim() ||
    profile?.phone?.trim() ||
    profile?.gender
  );

  /* ── Pre-fill from profile & skip duplicated steps ─────────── */
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || !profile) return;
    initializedRef.current = true;

    const knownStatus = (profile as any).church_status as 'member' | 'visitor' | 'seeker' | undefined;
    if (knownStatus) setChurchStatus(knownStatus);

    if (profileComplete) {
      // Profil déjà renseigné : il ne reste que le statut puis la prière.
      setStep(knownStatus ? 3 : 2);
    } else {
      // Pre-fill whatever is available
      if (profile.full_name) {
        setFirstName(profile.full_name.trim());
      }
      if (profile.phone) setPhone(profile.phone);
      if (profile.gender === 'homme' || profile.gender === 'femme') {
        setGender(profile.gender);
      }
    }
  }, [profile, profileComplete]);

  /* ── Progress bar ──────────────────────────────────────────── */
  const totalTransitions = 4;
  const progress = Math.min((step / totalTransitions) * 100, 100);

  /* ── Scroll to top on step change ──────────────────────────── */
  useEffect(() => {
    overlayRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  /* ── Navigation ────────────────────────────────────────────── */
  const goNext = () => {
    setStep((s) => Math.min(s + 1, 3));
  };

  const goBack = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  /* ── Submit all data (step 4 → step 5) ────────────────────── */
  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      // 1. Update profile
      if (firstName.trim()) {
        await db.updateProfile({
          full_name: firstName.trim(),
          phone: phone.trim() || undefined,
          gender: gender || undefined,
        });
      }
      if (churchStatus && user?.id) {
        try {
          await supabase.from('user_profiles').update({ church_status: churchStatus }).eq('id', user.id);
        } catch { /* migration 25 pas encore exécutée */ }
      }

      // 2. Le département se choisit ensuite depuis le tableau de bord.
      if (churchStatus === 'member') {
        await db.requestRoleUpgrade('member');
      }

      // 3. Save onboarding answers for admin visibility
      try {
        await supabase.from('onboarding_answers').insert({
          user_id: user?.id,
          full_name: firstName.trim() || null,
          phone: phone.trim() || null,
          gender: gender || null,
          department_id: null,
          department_name: null,
          position_id: null,
          position_name: null,
          motivation: churchStatus === 'seeker' ? 'Visiteur intéressé' : (churchStatus === 'member' ? 'Membre existant' : 'Visiteur'),
        });
      } catch {
        // Non-critical: onboarding_answers table might not exist yet
      }

      // 4. Seeker auto-prayer
      if (churchStatus === 'seeker') {
        await db.submitPrayerRequest(
          "Nouveau visiteur souhaitant en savoir plus sur l'église et la vie de foi.",
          false,
          false,
        );
      }

      // 5. Custom prayer request
      if (prayerContent.trim()) {
        await db.submitPrayerRequest(
          prayerContent.trim(),
          isAnonymous,
          isConfidential,
        );
      }

      setStep(4);
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : 'Une erreur est survenue',
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    firstName,
    phone,
    gender,
    churchStatus,
    prayerContent,
    isAnonymous,
    isConfidential,
    addToast,
    user?.id,
  ]);

  /* ── Finish onboarding (step 5) ────────────────────────────── */
  const handleFinish = useCallback(async () => {
    try {
      await db.completeOnboarding();
      await refreshProfile();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erreur', 'error');
    }
  }, [refreshProfile, addToast]);

  /* ── Step dots ─────────────────────────────────────────────── */
  const dotCount = 5;
  const activeDot = step;

  /* ═════════════════════════════════════════════════════════════
     Render
     ═════════════════════════════════════════════════════════════ */
  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-ink-950/[0.98]"
    >
      {/* ── Keyframe definitions ─────────────────────────────── */}
      <style>{`
        @keyframes onboard-drawCircle {
          from { stroke-dashoffset: 264; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes onboard-drawCheck {
          from { stroke-dashoffset: 55; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes onboard-scaleUp {
          from { transform: scale(0.8); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>

      {/* ── Progress bar ─────────────────────────────────────── */}
      <div className="sticky top-0 z-10 h-1 bg-ink-900">
        <div
          className="h-full bg-gradient-to-r from-accent-600 to-evangile-600 transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-2xl" key={step}>
          <div className="animate-fade-up">
            {step === 0 && <StepWelcome />}
            {step === 1 && <StepProfile />}
            {step === 2 && <StepStatus />}
            {step === 3 && <StepPrayer />}
            {step === 4 && <StepComplete />}
          </div>
        </div>
      </div>

      {/* ── Step dots ────────────────────────────────────────── */}
      {step < 4 && (
        <div className="flex items-center justify-center gap-2 pb-8">
          {Array.from({ length: dotCount }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === activeDot
                  ? 'w-6 bg-evangile-600'
                  : i < activeDot
                    ? 'w-1.5 bg-evangile-600/60'
                    : 'w-1.5 bg-cream/15'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );

  /* ═════════════════════════════════════════════════════════════
     Step 0 — Welcome
     ═════════════════════════════════════════════════════════════ */
  function StepWelcome() {
    return (
      <div className="relative flex flex-col items-center text-center gap-6">
        {/* Decorative radial glow */}
        <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-72 h-72 bg-radial-primary rounded-full opacity-80" />

        <div className="relative">
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold gold-text leading-tight">
            Bienvenue dans la famille !
          </h1>
        </div>

        <p className="relative text-muted text-base sm:text-lg max-w-md leading-relaxed">
          Quelques questions pour mieux vous connaître et personnaliser votre
          expérience.
        </p>

        <div className="relative flex flex-col items-center gap-4 mt-4">
          <button onClick={goNext} className="btn-gold animate-pulse-gold text-base px-10 py-4">
            <Sparkles className="w-5 h-5" />
            Commencer
          </button>
        </div>
      </div>
    );
  }

  /* ═════════════════════════════════════════════════════════════
     Step 1 — Basic Profile
     ═════════════════════════════════════════════════════════════ */
  function StepProfile() {
    const phoneDigits = phone.replace(/\D/g, '');
    const phoneValid = phoneDigits.length >= 9;

    return (
      <div className="glass rounded-2xl p-6 sm:p-10 max-w-lg mx-auto">
        <div className="mb-8">
          <span className="section-label">Profil</span>
          <h2 className="font-serif text-2xl sm:text-3xl text-cream mt-3">
            Parlons de vous
          </h2>
          <p className="text-muted text-sm mt-2">
            Ces informations nous aident à vous accueillir au mieux.
          </p>
        </div>

        {/* Indicateur « déjà rempli » */}
        {hasPartialProfileData && (
          <div className="flex items-start gap-3 rounded-xl bg-accent-400/5 border border-accent-400/20 px-4 py-3 mb-2">
            <CheckCircle2 className="w-5 h-5 text-accent-400 shrink-0 mt-0.5" />
            <p className="text-sm text-accent-400/80 leading-relaxed">
              Ces informations ont été renseignées lors de votre inscription.
              Vous pouvez les modifier si besoin.
            </p>
          </div>
        )}

        <div className="space-y-5">
          {/* Nom complet */}
          <div>
            <label className="block text-sm text-cream/80 mb-2 font-medium">
              Nom complet <span className="text-accent-400">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Prénom et nom"
              className="input-surface w-full px-4 py-3 text-sm"
              autoFocus
            />
          </div>

          {/* Téléphone — obligatoire */}
          <div>
            <label className="block text-sm text-cream/80 mb-2 font-medium">
              Téléphone <span className="text-accent-400">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+243 000 000 000"
              className="input-surface w-full px-4 py-3 text-sm"
            />
            <p className={`text-xs mt-2 ${phoneValid ? 'text-muted' : 'text-amber-400'}`}>
              {phoneValid
                ? 'Ce numéro servira à vous joindre et à vous connecter.'
                : 'Obligatoire : au moins 9 chiffres.'}
            </p>
          </div>

          {/* Genre */}
          <div>
            <label className="block text-sm text-cream/80 mb-3 font-medium">
              Genre
            </label>
            <div className="flex gap-3">
              {(['homme', 'femme'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 border ${
                    gender === g
                      ? 'bg-accent-400/15 border-accent-400/50 text-accent-400'
                      : 'bg-ink-900/50 border-line text-muted hover:border-accent-400/30'
                  }`}
                >
                  {g === 'homme' ? '\u{1F468} Homme' : '\u{1F469} Femme'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={goNext}
            disabled={!firstName.trim() || !phoneValid}
            className="btn-gold disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:animate-none"
          >
            Suivant
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  /* ═════════════════════════════════════════════════════════════
     Step 2 — Church Status
     ═════════════════════════════════════════════════════════════ */
  function StepStatus() {
    const options: {
      value: 'member' | 'visitor' | 'seeker';
      label: string;
      desc: string;
      Icon: LucideIcon;
    }[] = [
      {
        value: 'member',
        label: 'Je suis membre',
        desc: "J'ai déjà rejoint l'église",
        Icon: Users,
      },
      {
        value: 'visitor',
        label: 'Je suis nouveau visiteur',
        desc: "C'est ma première fois ici",
        Icon: Sparkles,
      },
      {
        value: 'seeker',
        label: 'Je cherche à en savoir plus',
        desc: 'Je souhaite découvrir la foi',
        Icon: Compass,
      },
    ];

    return (
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <span className="section-label">Statut</span>
          <h2 className="font-serif text-2xl sm:text-3xl text-cream mt-3">
            Votre situation
          </h2>
          <p className="text-muted text-sm mt-2">
            Comment décririez-vous votre relation avec l'église ?
          </p>
        </div>

        <div className="space-y-3">
          {options.map(({ value, label, desc, Icon }) => {
            const selected = churchStatus === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setChurchStatus(value)}
                className={`w-full glass rounded-xl p-4 sm:p-5 text-left transition-all duration-300 flex items-start gap-4 group ${
                  selected
                    ? 'border-evangile-600/60 bg-accent-400/5 shadow-lg shadow-accent-500/5'
                    : 'hover:border-accent-400/30'
                }`}
              >
                <div
                  className={`shrink-0 w-11 h-11 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                    selected
                      ? 'bg-accent-400/20 text-accent-400'
                      : 'bg-ink-800 text-muted group-hover:text-accent-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-cream font-medium text-sm sm:text-base">
                    {label}
                  </div>
                  <div className="text-muted text-xs sm:text-sm mt-0.5">
                    {desc}
                  </div>
                </div>
                {selected && (
                  <CheckCircle2 className="w-5 h-5 text-accent-400 shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex justify-between">
          <button
            onClick={goBack}
            className="btn-ghost text-sm px-5 py-2.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour
          </button>
          <button
            onClick={goNext}
            disabled={!churchStatus}
            className="btn-gold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Suivant
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  /* ═════════════════════════════════════════════════════════════
     Step 3 — Prayer & Preferences
     ═════════════════════════════════════════════════════════════ */
  function StepPrayer() {
    return (
      <div className="glass rounded-2xl p-6 sm:p-10 max-w-lg mx-auto">
        <div className="mb-8">
          <span className="section-label">Prière</span>
          <h2 className="font-serif text-2xl sm:text-3xl text-cream mt-3">
            Demande de prière
          </h2>
          <p className="text-muted text-sm mt-2">
            Notre communauté est là pour vous accompagner dans la prière.
          </p>
        </div>

        <div className="space-y-6">
          {/* Prayer textarea */}
          <div>
            <label className="block text-sm text-cream/80 mb-2 font-medium">
              Avez-vous une demande de prière ?{' '}
              <span className="text-muted font-normal">(optionnel)</span>
            </label>
            <textarea
              value={prayerContent}
              onChange={(e) => setPrayerContent(e.target.value)}
              placeholder="Partagez votre demande de prière ici..."
              rows={4}
              className="input-surface w-full px-4 py-3 text-sm resize-none"
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-5 h-5 rounded-md border border-line bg-ink-900/60 flex items-center justify-center peer-checked:bg-accent-400/20 peer-checked:border-accent-400/50 transition-all duration-200">
                  <Check className="w-3 h-3 text-accent-400 opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
              </div>
              <span className="text-sm text-muted group-hover:text-cream/80 transition-colors leading-relaxed">
                Rendre ma demande confidentielle (seul le pasteur verra)
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-5 h-5 rounded-md border border-line bg-ink-900/60 flex items-center justify-center peer-checked:bg-accent-400/20 peer-checked:border-accent-400/50 transition-all duration-200">
                  <Check className="w-3 h-3 text-accent-400 opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
              </div>
              <span className="text-sm text-muted group-hover:text-cream/80 transition-colors leading-relaxed">
                Masquer mon nom (demande anonyme)
              </span>
            </label>
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          <button
            onClick={goBack}
            className="btn-ghost text-sm px-5 py-2.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-gold disabled:opacity-60"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-ink-950/30 border-t-ink-950 rounded-full animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                Terminer
                <Check className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  /* ═════════════════════════════════════════════════════════════
     Step 4 — Completion
     ═════════════════════════════════════════════════════════════ */
  function StepComplete() {
    return (
      <div className="flex flex-col items-center text-center gap-6">
        {/* Animated checkmark */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ animation: 'onboard-scaleUp 0.5s ease-out forwards' }}
        >
          <svg
            width="96"
            height="96"
            viewBox="0 0 96 96"
            className="drop-shadow-lg"
          >
            <circle
              cx="48"
              cy="48"
              r="42"
              fill="none"
              stroke="url(#onboardGoldGrad)"
              strokeWidth="2.5"
              strokeDasharray="264"
              style={{
                animation: 'onboard-drawCircle 0.8s ease-out forwards',
              }}
            />
            <path
              d="M30 50 L42 62 L66 34"
              fill="none"
              stroke="#E3221F"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="55"
              style={{
                animation: 'onboard-drawCheck 0.5s ease-out 0.6s forwards',
              }}
            />
            <defs>
              <linearGradient
                id="onboardGoldGrad"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="50%" stopColor="#E3221F" />
                <stop offset="100%" stopColor="#c91916" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h2 className="font-serif text-3xl sm:text-4xl gold-text font-semibold">
          Votre profil est prêt !
        </h2>

        <p className="text-muted text-base max-w-md leading-relaxed">
          {churchStatus === 'member'
            ? 'Bienvenue parmi les membres ! Vous pourrez choisir votre département depuis votre tableau de bord.'
            : 'Bienvenue parmi nous ! Nous sommes heureux de vous compter dans notre communauté.'}
        </p>

        {churchStatus === 'seeker' && (
          <p className="text-muted/70 text-sm max-w-sm">
            Votre demande d'information a été transmise à notre équipe
            pastorale. Quelqu'un vous contactera bientôt.
          </p>
        )}

        <button
          onClick={handleFinish}
          className="btn-gold mt-4 text-base px-10 py-4"
        >
          Accéder au site
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    );
  }
}