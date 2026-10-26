import { useMemo, useState, type FormEvent } from 'react';
import { db, isSupabaseConfigured } from '../../lib/supabase';
import { CHURCH } from '../../lib/church';
import {
  CheckCircle2,
  Loader2,
  MessageCircle,
  Send,
} from '../../lib/icons';

/* ═══════════════════════════════════════════════════════════════════
   PRIÈRE & TÉMOIGNAGE — formulaire public
   En production : enregistré dans contact_messages (lecture réservée
   à l'équipe). Sans Supabase : le message s'ouvre dans WhatsApp.
   ═══════════════════════════════════════════════════════════════════ */

type MessageKind = 'priere' | 'temoignage';

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  message: '',
};

export function PrayerTestimony() {
  const [kind, setKind] = useState<MessageKind>('priere');
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const whatsappHref = useMemo(() => {
    const subject = kind === 'priere' ? 'Demande de prière' : 'Témoignage';
    const body = [
      `Bonjour, ${subject.toLowerCase()} de ${form.name || 'un visiteur'}.`,
      form.message,
      form.phone ? `Téléphone : ${form.phone}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    return `https://wa.me/${CHURCH.phone.href.replace(/\D/g, '')}?text=${encodeURIComponent(body)}`;
  }, [kind, form]);

  const updateField = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!isSupabaseConfigured) {
      window.open(whatsappHref, '_blank', 'noopener,noreferrer');
      return;
    }

    setSending(true);
    try {
      await db.submitContactMessage(
        form.name.trim(),
        form.phone.trim(),
        form.email.trim(),
        null,
        kind === 'priere' ? 'Demande de prière' : 'Témoignage',
        form.message.trim(),
      );
      setSent(true);
      setForm(EMPTY_FORM);
    } catch (err) {
      console.warn('[PrayerTestimony] envoi impossible:', err);
      setError("L'envoi n'a pas abouti. Vous pouvez nous écrire directement sur WhatsApp.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      id="priere"
      aria-label="Prière et témoignage"
      className="scroll-mt-24 border-y border-line bg-bg-card py-16 md:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid border border-line lg:grid-cols-12">
          <div className="border-b border-line p-6 sm:p-8 lg:col-span-5 lg:border-b-0 lg:border-r lg:p-10">
            <div className="flex items-center gap-4">
              <span className="rule-accent" />
              <p className="section-eyebrow">Prière & témoignage</p>
            </div>

            <h2 className="section-title mt-4">Confiez-nous votre sujet</h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
              Une demande de prière, une réponse à partager : écrivez-nous. Le message est
              transmis à l'équipe pastorale.
            </p>

            <blockquote className="mt-8 border-l-2 pl-4" style={{ borderColor: 'rgb(var(--brand-red-rgb))' }}>
              <p className="verse-quote text-base leading-relaxed">
                « Ne vous inquiétez de rien ; mais en toute chose faites connaître vos besoins
                à Dieu par des prières et des supplications, avec des actions de grâces. »
              </p>
              <footer className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Philippiens 4:6
              </footer>
            </blockquote>

            <div className="mt-8 border-t border-line pt-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                Contact direct
              </p>
              <a
                href={`https://wa.me/${CHURCH.phone.href.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-sm text-cream transition-colors hover:text-evangile-400"
              >
                <MessageCircle className="h-4 w-4 text-evangile-500" />
                {CHURCH.phone.display}
              </a>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:col-span-7 lg:p-10">
            {sent ? (
              <div className="flex h-full flex-col items-start justify-center py-6">
                <span className="flex h-12 w-12 items-center justify-center border border-line text-evangile-500">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-hero text-3xl uppercase leading-none text-cream">
                  Message transmis
                </h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
                  L'équipe pastorale en prend connaissance. Merci de votre confiance.
                </p>
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="btn-ghost mt-7"
                >
                  Écrire un autre message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                    Votre message concerne
                  </p>
                  <div className="flex border border-line">
                    {([
                      { value: 'priere', label: 'Prière' },
                      { value: 'temoignage', label: 'Témoignage' },
                    ] as const).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setKind(option.value)}
                        className={`flex-1 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                          kind === option.value
                            ? 'bg-evangile-600 text-white'
                            : 'text-muted hover:text-cream'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="prayer-name" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Nom complet <span className="text-evangile-500">*</span>
                    </label>
                    <input
                      id="prayer-name"
                      type="text"
                      required
                      autoComplete="name"
                      value={form.name}
                      onChange={(event) => updateField('name', event.target.value)}
                      placeholder="Votre nom"
                      className="input-surface w-full px-4 py-3 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="prayer-phone" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Téléphone <span className="text-evangile-500">*</span>
                    </label>
                    <input
                      id="prayer-phone"
                      type="tel"
                      required
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(event) => updateField('phone', event.target.value)}
                      placeholder={CHURCH.phone.display}
                      className="input-surface w-full px-4 py-3 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="prayer-email" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                    E-mail <span className="font-normal normal-case tracking-normal text-muted/60">(facultatif)</span>
                  </label>
                  <input
                    id="prayer-email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    placeholder="vous@email.com"
                    className="input-surface w-full px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="prayer-message" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Votre message <span className="text-evangile-500">*</span>
                  </label>
                  <textarea
                    id="prayer-message"
                    required
                    rows={4}
                    value={form.message}
                    onChange={(event) => updateField('message', event.target.value)}
                    placeholder={
                      kind === 'priere'
                        ? 'Partagez votre sujet de prière…'
                        : 'Racontez ce que Dieu a fait…'
                    }
                    className="input-surface w-full resize-none px-4 py-3 text-sm"
                  />
                </div>

                {error && (
                  <div className="border border-evangile-600/40 bg-evangile-600/5 p-3 text-sm text-cream">
                    {error}{' '}
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-evangile-400 underline underline-offset-4"
                    >
                      Ouvrir WhatsApp
                    </a>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4">
                  <button type="submit" disabled={sending} className="btn-primary">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {sending
                      ? 'Envoi…'
                      : isSupabaseConfigured
                        ? 'Envoyer à l’équipe'
                        : 'Envoyer via WhatsApp'}
                  </button>
                  <p className="max-w-xs text-[11px] leading-relaxed text-muted">
                    {isSupabaseConfigured
                      ? 'Message visible uniquement par l’équipe habilitée.'
                      : 'Votre message s’ouvrira dans WhatsApp.'}
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
