import { useState, useEffect } from 'react';
import { useReveal } from '../lib/hooks';
import { useDynamicTheme } from '../contexts/DynamicTheme';
import { SiteHeader } from '../components/SiteHeader';
import { SiteFooter } from '../components/SiteFooter';
import { MobileNav } from '../components/MobileNav';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Users, UserPlus, ArrowRight, Check, Send, MapPin, Calendar,
  Heart, Star, Compass, BookOpen, Mic, Music, Shield, GraduationCap, HandHeart, Loader2, LogIn, X, ChevronDown, ChevronUp,
} from '../lib/icons';
import type { Page } from '../lib/navigation';
import type { Department, ZoneEvangelisation } from '../types';
import { db, buildContentMap, getContent } from '../lib/supabase';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface DepartmentsPageProps {
  onNavigate: (page: Page) => void;
}

interface ExtendedDepartment extends Department {
  member_count?: number;
  leader_name?: string;
  meeting_schedule?: string;
  mission?: string;
  activities?: string;
  requirements?: string;
}

// ═══════════════════════════════════════════════════════════════════
// ICON MAPPING
// ═══════════════════════════════════════════════════════════════════

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Users, Heart, Star, Compass, BookOpen, Mic, Music,
  Shield, GraduationCap, HandHeart, MapPin,
};

function getDeptIcon(iconName: string) {
  return ICON_MAP[iconName] ?? Users;
}

// ═══════════════════════════════════════════════════════════════════
// HARDCODED SAMPLE DATA (fallback)
// ═══════════════════════════════════════════════════════════════════

const SAMPLE_DEPARTMENTS: ExtendedDepartment[] = [
  {
    id: 'dept-1',
    name: 'Évangélisation',
    slug: 'evangelisation',
    description: 'Porter la Bonne Nouvelle aux nations, faire des disciples et équiper les saints pour l\'œuvre du ministère.',
    icon_name: 'Compass',
    accent_color: 'gold',
    is_active: true,
    sort_order: 1,
    created_at: '',
    updated_at: '',
    member_count: 32,
    leader_name: 'Ancien David Kibwe',
    meeting_schedule: 'Samedi à 07h00',
    mission: 'Atteindre chaque quartier de Lubumbashi avec l\'Évangile, former des évangélistes et assurer le suivi des nouveaux convertis.',
    activities: 'Sorties d\'évangélisation hebdomadaires, distribution de Bibles et tracts, visites domiciliaires, campagnes de masse.',
    requirements: 'Être membre actif, avoir suivi les cours de baptême, avoir un cœur brûlant pour les âmes.',
  },
  {
    id: 'dept-2',
    name: 'Louange & Adoration',
    slug: 'louange',
    description: 'Élever le nom de Jésus à travers la musique, les chants et la danse pour la gloire de Dieu.',
    icon_name: 'Music',
    accent_color: 'ember',
    is_active: true,
    sort_order: 2,
    created_at: '',
    updated_at: '',
    member_count: 28,
    leader_name: 'Sœur Grâce Tshimanga',
    meeting_schedule: 'Mercredi à 17h00',
    mission: 'Créer une atmosphère de louange qui invite la présence de Dieu lors de chaque culte et événement.',
    activities: 'Répétitions hebdomadaires, composition de chants, formations musicales, accompagnement des cultes.',
    requirements: 'Avoir un talent musical ou vocal, être ponctuel aux répétitions, avoir un cœur d\'adorateur.',
  },
  {
    id: 'dept-3',
    name: 'Enseignement',
    slug: 'enseignement',
    description: 'Enseigner la Parole de Dieu avec fidélité et précision pour équiper les saints.',
    icon_name: 'BookOpen',
    accent_color: 'gold',
    is_active: true,
    sort_order: 3,
    created_at: '',
    updated_at: '',
    member_count: 15,
    leader_name: 'Pasteur Jean-Pierre Kalume',
    meeting_schedule: 'Jeudi à 18h00',
    mission: 'Former des enseignants et des disciples matures capables d\'enseigner à d\'autres.',
    activities: 'Préparation des cours bibliques, école du dimanche, formations des moniteurs, études bibliques.',
    requirements: 'Avoir une bonne connaissance de la Bible, être capable de communiquer clairement, fidélité à la Parole.',
  },
  {
    id: 'dept-4',
    name: 'Jeunesse',
    slug: 'jeunesse',
    description: 'Accompagner les jeunes dans leur marche avec Dieu et les préparer à être la génération conquérante.',
    icon_name: 'Star',
    accent_color: 'ember',
    is_active: true,
    sort_order: 4,
    created_at: '',
    updated_at: '',
    member_count: 45,
    leader_name: 'Frère Josué Mbayo',
    meeting_schedule: 'Samedi à 15h00',
    mission: 'Élever une génération de jeunes fervents, instruits dans la Parole et engagés pour Dieu.',
    activities: 'Cultes de jeunesse, activités récréatives, conférences, mentorat, sorties d\'évangélisation.',
    requirements: 'Être âgé de 15 à 35 ans, avoir un désir de servir Dieu, assister aux réunions régulièrement.',
  },
  {
    id: 'dept-5',
    name: 'Femmes de Grâce',
    slug: 'femmes',
    description: 'Rassembler les femmes autour de la Parole de Dieu, les encourager et les former.',
    icon_name: 'Heart',
    accent_color: 'gold',
    is_active: true,
    sort_order: 5,
    created_at: '',
    updated_at: '',
    member_count: 38,
    leader_name: 'Pasteur Marie Mwamba',
    meeting_schedule: '1er samedi du mois à 10h00',
    mission: 'Équiper les femmes pour qu\'elles deviennent des piliers spirituels dans leur foyer et leur communauté.',
    activities: 'Rencontres mensuelles, prière, partage, formations sur le mariage et la famille, actions sociales.',
    requirements: 'Être une femme membre de l\'église, avoir un cœur ouvert pour apprendre et servir.',
  },
  {
    id: 'dept-6',
    name: 'Hommes de Valor',
    slug: 'hommes',
    description: 'Former des hommes selon le cœur de Dieu, des leaders dans leur foyer et dans la société.',
    icon_name: 'Shield',
    accent_color: 'ember',
    is_active: true,
    sort_order: 6,
    created_at: '',
    updated_at: '',
    member_count: 22,
    leader_name: 'Ancien Samuel Ilunga',
    meeting_schedule: '1er samedi du mois à 08h00',
    mission: 'Développer la maturité spirituelle, la responsabilité et le leadership des hommes de l\'église.',
    activities: 'Petits-déjeuners de prière, études bibliques, activités sportives, mentorat, projets communautaires.',
    requirements: 'Être un homme membre de l\'église, désirer grandir dans la foi et le leadership.',
  },
];

const SAMPLE_ZONES: ZoneEvangelisation[] = [
  { id: 'z-1', name: 'Quartier Kenya', description: 'Zone résidentielle du centre-ville', coordinator_name: 'Frère Paul', converti_count: 24, potential_score: 8, last_visited: '2025-01-10', is_active: true, created_at: '' },
  { id: 'z-2', name: 'Quartier Katuba', description: 'Zone populeuse au sud de la ville', coordinator_name: 'Sœur Marie', converti_count: 18, potential_score: 9, last_visited: '2025-01-08', is_active: true, created_at: '' },
  { id: 'z-3', name: 'Commune Annexe', description: 'Zone périphérique en expansion', coordinator_name: 'Frère Jean', converti_count: 12, potential_score: 7, last_visited: '2025-01-05', is_active: true, created_at: '' },
  { id: 'z-4', name: 'Quartier Kampemba', description: 'Zone commerciale et résidentielle', coordinator_name: 'Sœur Ruth', converti_count: 31, potential_score: 9, last_visited: '2025-01-12', is_active: true, created_at: '' },
  { id: 'z-5', name: 'Quartier Lubumbashi', description: 'Zone historique du centre-ville', coordinator_name: 'Ancien David', converti_count: 42, potential_score: 10, last_visited: '2025-01-14', is_active: true, created_at: '' },
];

// ═══════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function RevealSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={`reveal ${visible ? 'in' : ''} ${className}`}>
      {children}
    </div>
  );
}

function DepartmentCard({ dept }: { dept: ExtendedDepartment }) {
  const [expanded, setExpanded] = useState(false);
  const IconComp = getDeptIcon(dept.icon_name);
  const isGold = dept.accent_color === 'gold';

  return (
    <div className="glass rounded-3xl overflow-hidden flex flex-col transition-all duration-300 hover:scale-[1.02] group h-full">
      <div className="p-6 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${isGold ? 'border-evangile-600/20 bg-evangile-600/10' : 'border-ember-500/20 bg-ember-500/10'}`}>
            <IconComp className={`h-6 w-6 ${isGold ? 'text-evangile-500' : 'text-ember-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-serif text-lg font-semibold text-cream">{dept.name}</h3>
            {dept.meeting_schedule && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <Calendar className="h-3.5 w-3.5 text-evangile-500" />
                {dept.meeting_schedule}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="mt-4 text-sm text-muted leading-relaxed">{dept.description}</p>

        {/* Meta */}
        <div className="mt-4 flex items-center gap-4 text-sm text-muted">
          {dept.leader_name && (
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-evangile-500" />
              <span className="font-medium text-cream">{dept.leader_name}</span>
            </span>
          )}
          {dept.member_count != null && (
            <span className="flex items-center gap-1.5">
              <UserPlus className="h-4 w-4 text-evangile-500" />
              {dept.member_count} membres
            </span>
          )}
        </div>

        {/* Expand button */}
        {(dept.mission || dept.activities || dept.requirements) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-4 flex items-center gap-1.5 text-sm font-medium text-evangile-500 transition-colors hover:text-evangile-400 self-start"
          >
            {expanded ? 'Voir moins' : 'En savoir plus'}
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}

        {/* Expanded details */}
        {expanded && (
          <div className="mt-4 space-y-4 border-t border-line pt-4">
            {dept.mission && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-evangile-500 mb-1.5">Mission</h4>
                <p className="text-sm text-muted leading-relaxed">{dept.mission}</p>
              </div>
            )}
            {dept.activities && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-evangile-500 mb-1.5">Activités</h4>
                <p className="text-sm text-muted leading-relaxed">{dept.activities}</p>
              </div>
            )}
            {dept.requirements && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-evangile-500 mb-1.5">Conditions pour rejoindre</h4>
                <p className="text-sm text-muted leading-relaxed">{dept.requirements}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function JoinForm({ departmentId, departmentName, onNavigate }: { departmentId: string; departmentName: string; onNavigate: (page: Page) => void }) {
  const { user } = useAuth();
  const [motivation, setMotivation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    return (
      <div className="glass rounded-3xl p-8 sm:p-12 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-evangile-600/20 bg-evangile-600/10">
            <LogIn className="h-6 w-6 text-evangile-500" />
          </div>
        </div>
        <h3 className="font-serif text-2xl font-semibold text-cream">Connectez-vous pour rejoindre</h3>
        <p className="mt-3 text-muted max-w-lg mx-auto">
          Vous devez être connecté en tant que membre pour soumettre une demande d'adhésion au département {departmentName}.
        </p>
        <button onClick={() => onNavigate('connexion')} className="btn-gold mt-6 px-8 py-3 text-sm">
          Se connecter
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivation.trim() || !user) return;
    setSubmitting(true);
    setError('');
    try {
      // Insérer dans department_members avec role_in_dept = 'pending'
      const { error: insertErr } = await supabase
        .from('department_members')
        .upsert({
          user_id: user.id,
          department_id: departmentId,
          role_in_dept: 'pending',
          is_active: true,
        }, { onConflict: 'user_id,department_id' });

      if (insertErr) throw new Error(insertErr.message);
      setSuccess(true);
      setMotivation('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="glass rounded-3xl p-8 sm:p-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10">
          <Check className="h-6 w-6 text-green-400" />
        </div>
        <h3 className="font-serif text-2xl font-semibold text-cream">Demande envoyée !</h3>
        <p className="mt-3 text-muted max-w-lg mx-auto">
          Votre demande d'adhésion au département {departmentName} a été soumise. Vous recevrez une notification une fois qu'elle sera traitée.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl p-8 sm:p-12">
      <h3 className="font-serif text-2xl font-semibold text-cream">Rejoindre le département {departmentName}</h3>
      <p className="mt-2 text-muted">Partagez votre motivation pour rejoindre ce département.</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="join-motivation" className="block text-sm font-medium text-cream mb-1.5">Votre motivation</label>
          <textarea
            id="join-motivation"
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            placeholder="Expliquez pourquoi vous souhaitez rejoindre ce département..."
            required
            rows={4}
            className="input-surface w-full !rounded-2xl px-4 py-3 text-sm resize-none"
          />
        </div>
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
        <button type="submit" disabled={submitting} className="btn-gold flex items-center gap-2 px-6 py-3 text-sm disabled:opacity-50">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? 'Envoi en cours...' : 'Envoyer la demande'}
        </button>
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════

export function DepartmentsPage({ onNavigate }: DepartmentsPageProps) {
  const { colorMode, toggleColorMode } = useDynamicTheme();
  const [departments, setDepartments] = useState<ExtendedDepartment[]>(SAMPLE_DEPARTMENTS);
  const [zones, setZones] = useState<ZoneEvangelisation[]>(SAMPLE_ZONES);
  const [contentMap, setContentMap] = useState<Record<string, string>>({});
  const [selectedDept, setSelectedDept] = useState<ExtendedDepartment | null>(null);

  // ── Fetch page contents ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const contents = await db.getPageContents('departments');
        if (!cancelled) setContentMap(buildContentMap(contents));
      } catch { /* fallback */ }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Fetch departments from DB ───────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [dbDepts, dbZones] = await Promise.all([
          db.getActiveDepartments(),
          db.getZonesEvangelisation(),
        ]);
        if (!cancelled) {
          if (dbDepts.length > 0) setDepartments(dbDepts as ExtendedDepartment[]);
          if (dbZones.length > 0) setZones(dbZones);
        }
      } catch { /* keep sample data */ }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const evangDept = departments.find((d) => d.slug === 'evangelisation') ?? departments.find((d) => d.name.toLowerCase().includes('evang')) ?? departments[0];
  const otherDepts = departments.filter((d) => d.id !== evangDept?.id);
  const heroSubtitle = getContent(contentMap, 'hero', 'subtitle', 'Servir ensemble pour la gloire de Dieu. Découvrez nos départements et trouvez votre place dans le corps du Christ.');

  // Impact stats
  const zonesCouvertes = zones.length;
  const convertisMois = zones.reduce((sum, z) => sum + z.converti_count, 0);

  return (
    <div className="min-h-screen bg-bg text-cream font-sans">
      <SiteHeader onNavigate={onNavigate} activePage="departments" />

      {/* ─── HERO ─── */}
      <section className="relative flex min-h-[40vh] items-center justify-center overflow-hidden pt-16 bg-radial-primary">
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-20 text-center">
          <RevealSection>
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-evangile-600/20 bg-evangile-600/10">
                <Users className="h-7 w-7 text-evangile-500" />
              </div>
            </div>
            <p className="section-label justify-center">Service</p>
            <h1 className="mt-4 font-serif text-5xl font-semibold text-cream sm:text-6xl">
              Nos Départements
            </h1>
            <p className="mt-6 text-lg text-muted">{heroSubtitle}</p>
          </RevealSection>
        </div>
      </section>

      {/* ─── DEPARTMENT GRID ─── */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <RevealSection>
          <h2 className="font-serif text-3xl font-semibold text-cream mb-8">Tous nos départements</h2>
        </RevealSection>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept, i) => (
            <RevealSection key={dept.id} className={`reveal-delay-${(i % 3) + 1}`}>
              <DepartmentCard dept={dept} />
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ─── FOCUS: DÉPARTEMENT D'ÉVANGÉLISATION ─── */}
      <section className="border-y border-line bg-navy-900/50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="mb-8">
              <span className="section-label">Département phare</span>
              <h2 className="mt-3 font-serif text-3xl font-semibold text-cream sm:text-4xl">
                Département d'Évangélisation
              </h2>
            </div>
          </RevealSection>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Mission & Info */}
            <RevealSection>
              <div className="glass rounded-3xl p-8 h-full">
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-evangile-600/20 bg-evangile-600/10">
                    <Compass className="h-7 w-7 text-evangile-500" />
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-semibold text-cream">Notre Mission</h3>
                    {evangDept.leader_name && (
                      <p className="text-sm text-muted mt-0.5">Dirigé par {evangDept.leader_name}</p>
                    )}
                  </div>
                </div>
                <p className="text-muted leading-relaxed">{evangDept.mission ?? evangDept.description}</p>
                {evangDept.meeting_schedule && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted">
                    <Calendar className="h-4 w-4 text-evangile-500" />
                    Réunion : {evangDept.meeting_schedule}
                  </div>
                )}
                {evangDept.activities && (
                  <div className="mt-6">
                    <h4 className="text-xs font-semibold uppercase tracking-widest text-evangile-500 mb-2">Nos Activités</h4>
                    <p className="text-sm text-muted leading-relaxed">{evangDept.activities}</p>
                  </div>
                )}
              </div>
            </RevealSection>

            {/* Right: Zones & Stats */}
            <RevealSection className="reveal-delay-1">
              <div className="space-y-6 h-full flex flex-col">
                {/* Impact Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass rounded-2xl p-5 text-center">
                    <div className="text-3xl font-bold text-evangile-500">{zonesCouvertes}</div>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted">Zones couvertes</p>
                  </div>
                  <div className="glass rounded-2xl p-5 text-center">
                    <div className="text-3xl font-bold text-evangile-500">{convertisMois}</div>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-muted">Convertis ce mois</p>
                  </div>
                </div>

                {/* Zones List */}
                <div className="glass rounded-2xl p-6 flex-1">
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-evangile-500 mb-4">Zones évangélisées</h4>
                  <div className="space-y-3">
                    {zones.map((zone) => (
                      <div key={zone.id} className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-evangile-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-cream">{zone.name}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-muted">{zone.converti_count} convertis</span>
                            {zone.coordinator_name && (
                              <>
                                <span className="text-xs text-muted/40">·</span>
                                <span className="text-xs text-muted">{zone.coordinator_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {zones.length === 0 && (
                      <p className="text-sm text-muted/60">Aucune zone configurée pour le moment.</p>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={() => setSelectedDept(evangDept)}
                  className="btn-gold flex items-center justify-center gap-2 py-3 text-sm"
                >
                  <UserPlus className="h-4 w-4" />
                  Rejoindre le département d'Évangélisation
                </button>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ─── JOIN REQUEST FORM ─── */}
      {selectedDept && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="relative">
              <JoinForm
                departmentId={selectedDept.id}
                departmentName={selectedDept.name}
                onNavigate={onNavigate}
              />
              <button
                onClick={() => setSelectedDept(null)}
                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition-all hover:border-evangile-600/40 hover:text-evangile-500"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </RevealSection>
        </section>
      )}

      {/* ─── GENERAL JOIN CTA ─── */}
      {!selectedDept && (
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="glass rounded-3xl p-8 sm:p-12 text-center">
              <div className="mb-4 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-evangile-600/20 bg-evangile-600/10">
                  <HandHeart className="h-6 w-6 text-evangile-500" />
                </div>
              </div>
              <h2 className="font-serif text-2xl font-semibold text-cream sm:text-3xl">Vous souhaitez servir ?</h2>
              <p className="mt-3 text-muted max-w-lg mx-auto">
                Chaque département a besoin de vous. Choisissez celui qui correspond à votre appel et soumettez votre demande d'adhésion.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {departments.slice(0, 4).map((dept) => (
                  <button
                    key={dept.id}
                    onClick={() => setSelectedDept(dept)}
                    className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-cream transition-all duration-200 hover:border-evangile-600/40 hover:text-evangile-500 hover:bg-evangile-600/5"
                  >
                    {dept.name}
                  </button>
                ))}
              </div>
            </div>
          </RevealSection>
        </section>
      )}

      <SiteFooter onNavigate={onNavigate} theme={colorMode} onToggleTheme={toggleColorMode} />
      <MobileNav onNavigate={onNavigate} active="departments" />
    </div>
  );
}