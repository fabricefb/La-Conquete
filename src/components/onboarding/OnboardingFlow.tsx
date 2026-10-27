/* ═══════════════════════════════════════════════════════════════════
   OnboardingFlow — Multi-step post-signup onboarding
   Église Évangélique La Conquête

   Les étapes sont des fonctions de rendu, pas des composants imbriqués :
   déclarées en composants, elles changeaient d'identité à chaque frappe,
   React remontait le champ et l'autoFocus du nom reprenait la main
   (impossible de taper un numéro de téléphone).
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

const TOTAL_STEPS = 4;

export function OnboardingFlow() {
  const { profile, user, refreshProfile } = useAuth();
  const { addToast } = useToast();
  const overlayRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'homme' | 'femme' | ''>('');

  const [churchStatus, setChurchStatus] = useState<
    'member' | 'visitor' | 'seeker' | ''
  >('');

  const [prayerContent, setPrayerContent] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

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

  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || !profile) return;
    initializedRef.current = true;

    const knownStatus = (profile as any).church_status as 'member' | 'visitor' | 'seeker' | undefined;
    if (knownStatus) setChurchStatus(knownStatus);

    if (profileComplete) {
      setStep(knownStatus ? 3 : 2);
    } else {
      if (profile.full_name) setFirstName(profile.full_name.trim());
      if (profile.phone) setPhone(profile.phone);
      if (profile.gender === 'homme' || profile.gender === 'femme') {
        setGender(profile.gender);
      }
    }
  }, [profile, profileComplete]);

  const progress = Math.min((step / TOTAL_STEPS) * 100, 100);

  useEffect(() => {
    overlayRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
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

      // Le département se choisit ensuite depuis le tableau de bord.
      if (churchStatus === 'member') {
        await db.requestRoleUpgrade('member');
      }

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

      if (churchStatus === 'seeker') {
        await db.submitPrayerRequest(
          "Nouveau visiteur souhaitant en savoir plus sur l'église et la vie de foi.",
          false,
          false,
        );
      }

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

  const handleFinish = useCallback(async () => {
    try {
      await db.completeOnboarding();
      await refreshProfile();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erreur', 'error');
    }
  }, [refreshProfile, addToast]);

  /* ═════════════════════════════════════════════════════════════
     Étape 0 — Bienvenue
     ═════════════════════════════════════════════════════════════ */
  const renderWelcome = () => (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <img
        src="/logo-conquete-circle.jpg"
        alt=""
        className="h-20 w-20 border border-line object-cover"
      />
      <div>
        <p className="section-eyebrow">Bienvenue</p>
        <h1 className="mt-3 font-hero text-[clamp(2rem,5vw,3rem)] uppercase leading-[0.95] tracking-[0.02em] text-cream">
          Dans la famille
        </h1>
      </div>
      <p className="max-w-sm text-sm leading-relaxed text-muted">
        Quelques questions pour mieux vous connaître et personnaliser votre
        expérience.
      </p>
      <button type="button" onClick={goNext} className="btn-primary mt-2">
        Commencer
        <ArrowRight className="h-4 w-4" />
      </button>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted/70">
        Église Évangélique La Conquête
      </p>
    </div>
  );

  /* ═════════════════════════════════════════════════════════════
     Étape 1 — Profil
     ═════════════════════════════════════════════════════════════ */
  const renderProfile = () => {
    const phoneDigits = phone.replace(/\D/g, '');
    const phoneValid = phoneDigits.length >= 9;

    return (
      <div className="border border-line bg-bg-card p-6 sm:p-9">
        <p className="section-eyebrow">Profil</p>
        <h2 className="mt-3 font-hero text-[clamp(1.6rem,4vw,2.25rem)] uppercase leading-[0.98] text-cream">
          Parlons de vous
        </h2>
        <p className="mt-2 text-sm text-muted">
          Ces informations nous aident à vous accueillir au mieux.
        </p>

        {hasPartialProfileData && (
          <div className="mt-5 flex items-start gap-3 border border-line bg-bg px-4 py-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-evangile-500" />
            <p className="text-xs leading-relaxed text-muted">
              Ces informations ont été renseignées lors de votre inscription.
              Vous pouvez les modifier si besoin.
            </p>
          </div>
        )}

        <div className="mt-6 space-y-5">
          <div>
            <label htmlFor="onboarding-name" className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Nom complet <span className="text-evangile-500">*</span>
            </label>
            <input
              id="onboarding-name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Prénom et nom"
              className="input-surface w-full px-4 py-3 text-sm"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="onboarding-phone" className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Téléphone <span className="text-evangile-500">*</span>
            </label>
            <input
              id="onboarding-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+243 000 000 000"
              className="input-surface w-full px-4 py-3 text-sm"
            />
            <p className={`mt-2 text-xs ${phoneValid ? 'text-muted' : 'text-amber-500'}`}>
              {phoneValid
                ? 'Ce numéro servira à vous joindre et à vous connecter.'
                : 'Obligatoire : au moins 9 chiffres.'}
            </p>
          </div>

          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Genre
            </span>
            <div className="grid grid-cols-2 gap-3">
              {(['homme', 'femme'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`border px-4 py-3 text-sm font-medium transition-colors ${
                    gender === g
                      ? 'border-evangile-600/60 bg-evangile-600/[0.07] text-cream'
                      : 'border-line bg-bg text-muted hover:border-evangile-600/40'
                  }`}
                >
                  {g === 'homme' ? 'Homme' : 'Femme'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={goNext}
            disabled={!firstName.trim() || !phoneValid}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Suivant
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  /* ═════════════════════════════════════════════════════════════
     Étape 2 — Situation
     ═════════════════════════════════════════════════════════════ */
  const renderStatus = () => {
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
      <div>
        <p className="section-eyebrow">Statut</p>
        <h2 className="mt-3 font-hero text-[clamp(1.6rem,4vw,2.25rem)] uppercase leading-[0.98] text-cream">
          Votre situation
        </h2>
        <p className="mt-2 text-sm text-muted">
          Comment décririez-vous votre relation avec l’église ?
        </p>

        <div className="mt-6 space-y-3">
          {options.map(({ value, label, desc, Icon }) => {
            const selected = churchStatus === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setChurchStatus(value)}
                className={`flex w-full items-start gap-4 border p-4 text-left transition-colors sm:p-5 ${
                  selected
                    ? 'border-evangile-600/60 bg-evangile-600/[0.06]'
                    : 'border-line bg-bg-card hover:border-evangile-600/40'
                }`}
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center border ${
                    selected
                      ? 'border-evangile-600/40 text-evangile-500'
                      : 'border-line text-muted'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-cream sm:text-base">
                    {label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted sm:text-sm">
                    {desc}
                  </span>
                </span>
                {selected && (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-evangile-500" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <button type="button" onClick={goBack} className="btn-ghost text-sm">
            <ChevronLeft className="h-4 w-4" />
            Retour
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!churchStatus}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Suivant
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  /* ═════════════════════════════════════════════════════════════
     Étape 3 — Prière
     ═════════════════════════════════════════════════════════════ */
  const renderPrayer = () => (
    <div className="border border-line bg-bg-card p-6 sm:p-9">
      <p className="section-eyebrow">Prière</p>
      <h2 className="mt-3 font-hero text-[clamp(1.6rem,4vw,2.25rem)] uppercase leading-[0.98] text-cream">
        Demande de prière
      </h2>
      <p className="mt-2 text-sm text-muted">
        Notre communauté est là pour vous accompagner dans la prière.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <label htmlFor="onboarding-prayer" className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Avez-vous une demande de prière ?{' '}
            <span className="font-normal normal-case tracking-normal text-muted/70">
              (optionnel)
            </span>
          </label>
          <textarea
            id="onboarding-prayer"
            value={prayerContent}
            onChange={(e) => setPrayerContent(e.target.value)}
            placeholder="Partagez votre demande de prière ici…"
            rows={4}
            className="input-surface w-full resize-none px-4 py-3 text-sm"
          />
        </div>

        <div className="space-y-3">
          {[
            {
              checked: isConfidential,
              onChange: setIsConfidential,
              label: 'Rendre ma demande confidentielle (seul le pasteur verra)',
            },
            {
              checked: isAnonymous,
              onChange: setIsAnonymous,
              label: 'Masquer mon nom (demande anonyme)',
            },
          ].map(({ checked, onChange, label }) => (
            <label key={label} className="flex cursor-pointer items-start gap-3">
              <span className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => onChange(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="grid h-5 w-5 place-items-center border border-line bg-bg transition-colors peer-checked:border-evangile-600/60 peer-checked:bg-evangile-600/10">
                  <Check className="h-3 w-3 text-evangile-500 opacity-0 transition-opacity peer-checked:opacity-100" />
                </span>
              </span>
              <span className="text-sm leading-relaxed text-muted">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button type="button" onClick={goBack} className="btn-ghost text-sm">
          <ChevronLeft className="h-4 w-4" />
          Retour
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-primary disabled:opacity-60"
        >
          {submitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Enregistrement…
            </>
          ) : (
            <>
              Terminer
              <Check className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  /* ═════════════════════════════════════════════════════════════
     Étape 4 — Confirmation
     ═════════════════════════════════════════════════════════════ */
  const renderComplete = () => (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <div className="grid h-20 w-20 place-items-center border border-line bg-bg-card">
        <CheckCircle2 className="h-9 w-9 text-evangile-500" />
      </div>

      <div>
        <p className="section-eyebrow">Profil enregistré</p>
        <h2 className="mt-3 font-hero text-[clamp(1.8rem,4.5vw,2.6rem)] uppercase leading-[0.96] text-cream">
          Votre profil est prêt
        </h2>
      </div>

      <p className="max-w-md text-sm leading-relaxed text-muted">
        {churchStatus === 'member'
          ? 'Bienvenue parmi les membres. Vous pourrez choisir votre département depuis votre tableau de bord.'
          : 'Bienvenue parmi nous. Nous sommes heureux de vous compter dans notre communauté.'}
      </p>

      {churchStatus === 'seeker' && (
        <p className="max-w-sm text-xs leading-relaxed text-muted/80">
          Votre demande d’information a été transmise à notre équipe pastorale.
          Quelqu’un vous contactera bientôt.
        </p>
      )}

      <button type="button" onClick={handleFinish} className="btn-primary mt-2">
        Accéder au site
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );

  /* ═════════════════════════════════════════════════════════════
     Rendu
     ═════════════════════════════════════════════════════════════ */
  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-bg"
    >
      <header className="sticky top-0 z-10 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4 sm:px-6">
          <img
            src="/logo-conquete-circle.jpg"
            alt=""
            className="h-9 w-9 border border-line object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-cream">
              La Conquête
            </p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">
              Création du profil
            </p>
          </div>
          {step < TOTAL_STEPS && (
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted">
              {step + 1} / {TOTAL_STEPS}
            </span>
          )}
        </div>
        <div className="h-[3px] w-full bg-line/30">
          <div
            className="h-full bg-evangile-600 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6 sm:py-14">
        <div className="w-full max-w-xl">
          <div key={step} className="animate-fade-up">
            {step === 0 && renderWelcome()}
            {step === 1 && renderProfile()}
            {step === 2 && renderStatus()}
            {step === 3 && renderPrayer()}
            {step === 4 && renderComplete()}
          </div>
        </div>
      </main>

      {step < 4 && (
        <div className="flex items-center justify-center gap-2 pb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <span
              key={i}
              className={`h-1 transition-all duration-500 ${
                i === step
                  ? 'w-6 bg-evangile-600'
                  : i < step
                    ? 'w-2 bg-evangile-600/60'
                    : 'w-2 bg-cream/15'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
