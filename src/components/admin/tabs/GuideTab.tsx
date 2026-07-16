import {
  Eye, EyeOff, GripVertical, Palette,
  Image as ImageIcon, MapPin, ChevronDown, ChevronRight,
  BookOpen, Info, Lightbulb, AlertTriangle,
} from 'lucide-react';
import { useState } from 'react';

/* ═══════════════════════════════════════════════════════════════════
   Guide Tab — Documentation du back office
   ═══════════════════════════════════════════════════════════════════ */

function AccordionItem({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  accent = 'text-amber-400',
}: {
  title: string;
  icon: typeof Info;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accent?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/5"
      >
        <Icon className={`h-5 w-5 shrink-0 ${accent}`} />
        <span className="flex-1 text-sm font-semibold text-white">{title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-white/40" /> : <ChevronRight className="h-4 w-4 text-white/40" />}
      </button>
      {open && (
        <div className="border-t border-white/5 px-5 py-4 text-sm text-white/70 leading-relaxed space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

function Step({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-400">
        {num}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-2 rounded-lg bg-black/40 border border-white/5 p-3 text-xs text-amber-300/80 font-mono overflow-x-auto">
      {children}
    </pre>
  );
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg bg-amber-500/5 border border-amber-500/15 p-3">
      <Lightbulb className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
      <div className="text-xs text-amber-200/80">{children}</div>
    </div>
  );
}

function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg bg-red-500/5 border border-red-500/15 p-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
      <div className="text-xs text-red-200/80">{children}</div>
    </div>
  );
}

export function GuideTab() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-12">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/20">
            <BookOpen className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Guide du back office</h1>
            <p className="text-xs text-white/40">Comment gérer la page d'accueil et le site depuis le panneau d'administration</p>
          </div>
        </div>
      </div>

      {/* ─── Section 1: Vue d'ensemble ─── */}
      <AccordionItem title="Vue d'ensemble de la page d'accueil" icon={Info} defaultOpen accent="text-blue-400">
        <p>
          La page d'accueil est composee de <strong className="text-white">12 sections</strong>, chacune
          controlable independamment depuis le back office. Voici l'ordre actuel :
        </p>
        <div className="mt-3 space-y-1.5 text-xs">
          {[
            ['0 — Barre superieure', 'Communiques defilants, compte a rebours, indicateur en direct'],
            ['1 — Hero plein ecran', 'Image de fond avec diaporama, titre, sous-titre, boutons CTA'],
            ['2 — Versets bibliques', 'Cartes de versets avec rotation automatique'],
            ['3 — Trois Piliers', 'Foi, Communaute, Mission — piliers fondamentaux de l\'eglise'],
            ['4 — Nous sommes uniques', 'Section "A propos" avec image et texte descriptif'],
            ['5 — Explorer', '4 cartes d\'activites : Predications, Evenements, Ministeres, Medias'],
            ['6 — Citation biblique', 'Citation plein ecran sur fond sombre'],
            ['7 — Equipe pastorale', 'Grille des pasteurs avec photos et bios'],
            ['8 — Temoignages', 'Carrousel des temoignages publies'],
            ['9 — Blog / Actualites', 'Derniers articles du blog'],
            ['10 — Appel a action', 'Section finale avec bouton "Rejoindre"'],
            ['11 — Carte de localisation', 'Google Maps embed pleine largeur'],
          ].map(([label, desc]) => (
            <div key={label} className="flex gap-2">
              <span className="text-white/50 font-mono shrink-0 w-40">{label}</span>
              <span className="text-white/50">{desc}</span>
            </div>
          ))}
        </div>
        <TipBox>
          La section <strong>Hero plein ecran</strong> (1) et le <strong>Footer</strong> ne peuvent pas etre masques
          car ils font partie de la structure fixe du site.
        </TipBox>
      </AccordionItem>

      {/* ─── Section 2: Afficher / Masquer ─── */}
      <AccordionItem title="Afficher ou masquer une section" icon={EyeOff} defaultOpen accent="text-emerald-400">
        <p>
          Chaque section a un <strong className="text-white">interrupteur de visibilite</strong> (icone oeil).
          Quand une section est masquee, elle n'apparait plus du tout sur la page d'accueil publique.
        </p>

        <div className="mt-3">
          <Step num={1}>
            <p className="text-white/80">Dans le menu gauche du back office, cliquez sur <strong className="text-white">Pages → Page d'accueil</strong></p>
          </Step>
          <Step num={2}>
            <p className="text-white/80">La liste des 12 sections apparait dans le panneau gauche</p>
          </Step>
          <Step num={3}>
            <div className="text-white/80">
              <p>Cliquez sur l'icone <Eye className="inline h-3.5 w-3.5 text-white/50" /> (ouvre) ou <EyeOff className="inline h-3.5 w-3.5 text-red-400/70" /> (ferme) a droite de chaque section</p>
              <p className="mt-1 text-white/40">— Oeil ouvert = section visible sur le site</p>
              <p className="text-white/40">— Oeil barre = section masquee sur le site</p>
            </div>
          </Step>
          <Step num={4}>
            <p className="text-white/80">Cliquez sur <strong className="text-amber-400">Enregistrer</strong> en haut a droite</p>
          </Step>
        </div>

        <WarningBox>
          N'oubliez pas de cliquer sur <strong>"Enregistrer"</strong> apres chaque modification. Les changements ne sont pas sauvegardes automatiquement.
        </WarningBox>
      </AccordionItem>

      {/* ─── Section 3: Reordonner ─── */}
      <AccordionItem title="Changer l'ordre des sections" icon={GripVertical} accent="text-purple-400">
        <p>
          Vous pouvez reorganiser l'ordre d'affichage des sections par <strong className="text-white">glisser-deposer</strong> (drag and drop).
        </p>
        <div className="mt-3">
          <Step num={1}>Cliquez et maintenez l'icone <GripVertical className="inline h-4 w-4 text-white/40" /> a gauche d'une section</Step>
          <Step num={2}>Faites glisser la section vers le haut ou le bas dans la liste</Step>
          <Step num={3}>Relachez a la position souhaitee</Step>
          <Step num={4}>Cliquez sur <strong className="text-amber-400">Enregistrer</strong></Step>
        </div>
        <TipBox>
          L'ordre des sections definit leur position d'affichage sur la page d'accueil, de haut en bas.
          La premiere section visible apres le Hero sera la premiere que les visiteurs voient en defilant.
        </TipBox>
      </AccordionItem>

      {/* ─── Section 4: Configurer chaque section ─── */}
      <AccordionItem title="Configurer une section en detail" icon={Palette} accent="text-pink-400">
        <p>
          Chaque section a des <strong className="text-white">parametres specifiques</strong>. Cliquez sur le nom
          de la section dans le panneau gauche pour voir ses options.
        </p>

        <div className="mt-3 space-y-3">
          <div>
            <p className="text-white font-medium text-xs uppercase tracking-wider mb-1">Hero plein ecran</p>
            <ul className="list-disc pl-4 space-y-0.5 text-xs text-white/60">
              <li><strong>Images du hero</strong> : Uploadez ou collez des URLs R2 pour le diaporama</li>
              <li><strong>Opacite de l'overlay</strong> : Contrôlez la transparence du fond sombre sur l'image (0-100%)</li>
              <li><strong>Vitesse d'animation</strong> : Vitesse de transition entre les images du diaporama</li>
              <li><strong>Badge / Sous-titre / Boutons CTA</strong> : Textes affiches sur le hero</li>
              <li><strong>Couleur de l'overlay</strong> : Couleur du fond par-dessus l'image</li>
            </ul>
          </div>

          <div>
            <p className="text-white font-medium text-xs uppercase tracking-wider mb-1">Trois Piliers</p>
            <ul className="list-disc pl-4 space-y-0.5 text-xs text-white/60">
              <li><strong>Colonnes</strong> : 1, 2 ou 3 colonnes</li>
              <li><strong>Echelle au survol</strong> : Effet de zoom au passage de la souris</li>
            </ul>
            <p className="text-xs text-white/40 mt-1">Le texte des piliers se modifie dans l'onglet "Contenus" (section "pillars")</p>
          </div>

          <div>
            <p className="text-white font-medium text-xs uppercase tracking-wider mb-1">Explorer</p>
            <ul className="list-disc pl-4 space-y-0.5 text-xs text-white/60">
              <li><strong>Colonnes</strong> : 2, 3 ou 4 cartes par rangee</li>
              <li><strong>Zoom au survol</strong> : Effet de zoom sur les images</li>
            </ul>
          </div>

          <div>
            <p className="text-white font-medium text-xs uppercase tracking-wider mb-1">Equipe pastorale</p>
            <ul className="list-disc pl-4 space-y-0.5 text-xs text-white/60">
              <li><strong>Colonnes</strong> : 2 a 4 pasteurs par rangee</li>
              <li><strong>Afficher la biographie</strong> : Montrer ou cacher le texte bio sous chaque pasteur</li>
              <li><strong>Affichage maximum</strong> : Limiter le nombre de pasteurs affiches (4-12)</li>
            </ul>
          </div>

          <div>
            <p className="text-white font-medium text-xs uppercase tracking-wider mb-1">Carte de localisation</p>
            <ul className="list-disc pl-4 space-y-0.5 text-xs text-white/60">
              <li><strong>URL d'integration</strong> : Collez le lien Google Maps embed</li>
              <li><strong>Hauteur</strong> : Hauteur de la carte en pixels (200-800px)</li>
            </ul>
          </div>

          <div>
            <p className="text-white font-medium text-xs uppercase tracking-wider mb-1">Appel a action</p>
            <ul className="list-disc pl-4 space-y-0.5 text-xs text-white/60">
              <li><strong>Opacite de l'overlay</strong> : Transparence du fond sombre</li>
              <li><strong>Afficher le coeur</strong> : Animation du coeur pulsant</li>
              <li><strong>Titre / Texte / Bouton CTA</strong> : Textes personnalises</li>
            </ul>
          </div>
        </div>
      </AccordionItem>

      {/* ─── Section 5: Couleurs ─── */}
      <AccordionItem title="Modifier les couleurs d'une section" icon={Palette} accent="text-yellow-400">
        <p>
          Chaque section peut avoir une <strong className="text-white">couleur de texte</strong> et une
          <strong className="text-white"> couleur de fond</strong> personnalisees.
        </p>
        <div className="mt-3">
          <Step num={1}>Cliquez sur une section dans le panneau gauche</Step>
          <Step num={2}>Descendez jusqu'a la section <strong>"Couleurs"</strong> (avec l'icone palette)</Step>
          <Step num={3}>
            <div>
              <p className="text-white/80">Utilisez les selecteurs de couleur pour :</p>
              <p className="text-white/60 mt-1">— <strong>Couleur du texte</strong> : Change la couleur de tous les textes de la section</p>
              <p className="text-white/60">— <strong>Couleur de fond</strong> : Change la couleur d'arriere-plan de la section</p>
            </div>
          </Step>
          <Step num={4}>Cliquez sur <strong className="text-amber-400">Enregistrer</strong></Step>
        </div>
        <TipBox>
          Laissez les champs vides pour utiliser les couleurs par defaut du theme. Les couleurs sont stockees
          separement de la config des sections, elles sont donc preservees meme si vous reinitialisez la configuration.
        </TipBox>
      </AccordionItem>

      {/* ─── Section 6: Images du Hero ─── */}
      <AccordionItem title="Gerer les images du Hero (diaporama)" icon={ImageIcon} accent="text-cyan-400">
        <p>
          Le Hero supporte un <strong className="text-white">diaporama automatique</strong> avec plusieurs images.
          Les images changent toutes les 30 secondes avec une transition fluide.
        </p>
        <div className="mt-3">
          <Step num={1}>Cliquez sur <strong>"Hero plein ecran"</strong> dans le panneau gauche</Step>
          <Step num={2}>Dans la section <strong>"Images du hero"</strong>, vous pouvez :</Step>
        </div>
        <ul className="mt-2 list-disc pl-10 space-y-1 text-xs text-white/60">
          <li><strong>Collez une URL R2</strong> directement dans le champ texte</li>
          <li><strong>Cliquez "Parcourir"</strong> pour uploader depuis votre ordinateur vers R2</li>
          <li><strong>Glissez-deposez</strong> une image directement dans la zone</li>
          <li>Cliquez sur la <strong>poubelle</strong> pour supprimer une image</li>
        </ul>
        <TipBox>
          Utilisez des images de preference en format <strong>1920x1080</strong> (16:9) pour un rendu optimal.
          Les images sont hebergees sur Cloudflare R2 pour un chargement rapide.
        </TipBox>
        <CodeBlock>{`URL R2 exemple :
https://pub-344d6377f96445089f6ad71c3ab2fc80.r2.dev/hero/mon-image.jpg`}</CodeBlock>
      </AccordionItem>

      {/* ─── Section 7: Modifier les textes ─── */}
      <AccordionItem title="Modifier les textes (contenus)" icon={BookOpen} accent="text-orange-400">
        <p>
          Les <strong className="text-white">textes et images</strong> se gerent dans l'onglet
          <strong className="text-white"> "Contenus"</strong> (categorie "Contenu" du menu).
          L&apos;interface est organisee en 3 colonnes : <strong>Pages</strong> {'>'} <strong>Sections</strong> {'>'} <strong>Champs</strong>.
        </p>
        <div className="mt-3">
          <Step num={1}>
            <p className="text-white/80">Cliquez sur la <strong>page</strong> desiree dans le panneau de gauche</p>
            <p className="text-white/40 text-xs mt-0.5">Ex : "Page d'accueil", "A propos", "Activites", etc.</p>
          </Step>
          <Step num={2}>
            <p className="text-white/80">Cliquez sur la <strong>section</strong> dans le deuxieme panneau</p>
            <p className="text-white/40 text-xs mt-0.5">Ex : "Hero plein ecran", "Trois Piliers", "Qui sommes-nous"</p>
          </Step>
          <Step num={3}>
            <p className="text-white/80">Modifiez les <strong>champs</strong> dans la zone de droite</p>
            <p className="text-white/40 text-xs mt-0.5">Les champs modifies sont surlignes en jaune. Cliquez "Enregistrer" en bas a gauche.</p>
          </Step>
        </div>
        <div className="mt-3">
          <p className="text-white font-medium text-xs mb-1.5">Pages disponibles :</p>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {[
              "Page d'accueil — Hero, Piliers, A propos, Citation",
              'A propos — Hero, Valeurs',
              'Activites — Hero, Ministeres, CTA',
              'Evenements — Hero',
              'Contact — Hero',
              'Departements — Hero',
              'Medias — Hero',
              'Emissions — Hero',
              'Predications — Hero',
            ].map((p) => (
              <div key={p} className="rounded-lg bg-white/[0.03] border border-white/5 px-2 py-1.5 text-white/60 truncate">
                {p}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <p className="text-white font-medium text-xs mb-1.5">Exemples de champs (Page d'accueil) :</p>
          <div className="rounded-lg bg-black/30 border border-white/5 p-3 text-xs space-y-1">
            <p className="text-white/50"><span className="text-amber-400/70">Hero</span> → bg_image, bg_images, subtitle</p>
            <p className="text-white/50"><span className="text-amber-400/70">Trois Piliers</span> → pillar_1_title, pillar_1_desc, ...</p>
            <p className="text-white/50"><span className="text-amber-400/70">Qui sommes-nous</span> → text_1, text_2, bible_text</p>
            <p className="text-white/50"><span className="text-amber-400/70">Citation biblique</span> → text, reference</p>
          </div>
        </div>
        <TipBox>
          <strong>Constructeur de page</strong> = l'ordre, la visibilite et les parametres techniques.
          <br />
          <strong>Contenus</strong> = les textes et images affiches dans chaque section.
          <br />
          Pour les images, le champ de type "Image" offre un upload direct vers R2 + collage d'URL.
        </TipBox>
      </AccordionItem>

      {/* ─── Section 8: Carte Google Maps ─── */}
      <AccordionItem title="Configurer la carte Google Maps" icon={MapPin} accent="text-green-400">
        <p>
          La section <strong className="text-white">"Carte de localisation"</strong> (section 11) affiche
          une carte Google Maps pleine largeur. Vous pouvez personnaliser l'URL et la hauteur.
        </p>
        <div className="mt-3">
          <Step num={1}>Cliquez sur <strong>"Carte de localisation"</strong> dans le panneau gauche du constructeur</Step>
          <Step num={2}>
            <div>
              <p className="text-white/80">Pour obtenir l'URL d'integration :</p>
              <ol className="list-decimal pl-4 mt-1 space-y-0.5 text-xs text-white/60">
                <li>Allez sur <strong>Google Maps</strong></li>
                <li>Recherchez votre lieu (eglise)</li>
                <li>Cliquez sur <strong>"Partager"</strong></li>
                <li>Choisissez l'onglet <strong>"Integrer une carte"</strong></li>
                <li>Copiez le lien qui commence par <code className="text-amber-300/80">https://www.google.com/maps/embed?...</code></li>
              </ol>
            </div>
          </Step>
          <Step num={3}>Collez l'URL dans le champ <strong>"URL d'integration Google Maps"</strong></Step>
          <Step num={4}>Ajustez la <strong>hauteur</strong> avec le curseur (200 a 800 pixels)</Step>
          <Step num={5}>Cliquez sur <strong className="text-amber-400">Enregistrer</strong></Step>
        </div>
      </AccordionItem>

      {/* ─── Section 9: En-tete & Navigation ─── */}
      <AccordionItem title="Images de l'en-tete et navigation" icon={ImageIcon} accent="text-indigo-400">
        <p>
          En haut de la liste des sections, un raccourci <strong className="text-white">"En-tete & Navigation"</strong>
          permet de gerer les images du header et du mega menu.
        </p>
        <ul className="mt-2 list-disc pl-4 space-y-0.5 text-xs text-white/60">
          <li><strong>Logo principal</strong> : Logo affiche dans l'en-tete du site</li>
          <li><strong>Logo du footer</strong> : Logo affiche dans le pied de page</li>
          <li><strong>Images du mega menu</strong> : Images affichees dans les menus deroulants de la navigation</li>
        </ul>
        <TipBox>
          Comme pour le Hero, vous pouvez coller une URL R2, cliquer "Parcourir" ou glisser-deposer une image.
        </TipBox>
      </AccordionItem>

      {/* ─── Section 10: Reinitialiser ─── */}
      <AccordionItem title="Reinitialiser la configuration" icon={AlertTriangle} accent="text-red-400">
        <p>
          Le bouton <strong className="text-white">"Reinitialiser"</strong> en haut a droite remet toutes les sections
          a leur ordre, visibilite et parametres par defaut.
        </p>
        <WarningBox>
          La reinitialisation <strong>supprime toutes vos modifications</strong> (ordre, visibilite, parametres).
          Cependant, les couleurs personnalisees et les contenus textes sont conserves.
          Cliquez sur "Enregistrer" apres une reinitialisation pour confirmer.
        </WarningBox>
      </AccordionItem>

      {/* ─── Section 11: Pages multiples ─── */}
      <AccordionItem title="Gerer les autres pages" icon={BookOpen} accent="text-teal-400">
        <p>
          Le constructeur de page ne se limite pas a la page d'accueil. En haut du panneau gauche,
          vous pouvez selectionner d'autres pages :
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
          {[
            ['Culte', 'Sections de la page de culte'],
            ['Vision & Mission', 'Sections de la page vision'],
            ['Pasteurs', 'Sections de la page pastorale'],
            ['Ministeres', 'Sections des ministeres'],
            ['Jeunesse', 'Sections jeunesse'],
            ['Enseignements', 'Sections enseignements'],
            ['Blog', 'Sections du blog'],
          ].map(([page, desc]) => (
            <div key={page} className="rounded-lg bg-white/[0.03] border border-white/5 p-2">
              <p className="font-medium text-white/80">{page}</p>
              <p className="text-white/40 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-white/60 text-xs">
          Le principe est le meme : visibilite, ordre, couleurs et parametres par section.
        </p>
      </AccordionItem>

      {/* ─── Section 12: Parametres globaux ─── */}
      <AccordionItem title="Parametres globaux du site" icon={Info} accent="text-slate-400">
        <p>
          L'onglet <strong className="text-white">"Parametres"</strong> (en bas du menu, categorie "Systeme")
          contient les reglages globaux du site, organises en categories :
        </p>
        <ul className="mt-2 list-disc pl-4 space-y-1 text-xs text-white/60">
          <li><strong>General</strong> : Nom du site, description, langue</li>
          <li><strong>Contact</strong> : Adresse, telephone, email</li>
          <li><strong>Reseaux sociaux</strong> : Facebook, Instagram, YouTube, etc.</li>
          <li><strong>SEO</strong> : Meta titre, meta description pour le referencement</li>
        </ul>
        <TipBox>
          Les parametres de contact (adresse, telephone, email) sont utilises dans le <strong>Footer</strong>
          et la <strong>page Contact</strong>. Ils ne sont plus affiches dans une section "Bandeau contact"
          sur la page d'accueil — cette section a ete remplacee par la carte de localisation.
        </TipBox>
      </AccordionItem>
    </div>
  );
}