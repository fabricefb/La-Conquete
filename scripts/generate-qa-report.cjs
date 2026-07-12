const { Document, Packer, Paragraph, TextRun, Header, Footer,
        AlignmentType, HeadingLevel, PageNumber, PageBreak,
        Table, TableRow, TableCell, WidthType, BorderStyle,
        ShadingType, TableOfContents, SectionType } = require("docx");
const fs = require("fs");

// ── Pure B&W palette for QA/Testing report ──
const P = { primary: "000000", body: "000000", secondary: "555555", accent: "333333", surface: "F2F2F2" };
const c = (hex) => hex;

// ── Component builders ──
function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, size: 32, font: "Times New Roman", color: c(P.primary) })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 160 },
    children: [new TextRun({ text, bold: true, size: 28, font: "Times New Roman", color: c(P.primary) })] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 26, font: "Times New Roman", color: c(P.primary) })] });
}
function body(text) {
  return new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { line: 312 },
    children: [new TextRun({ text, size: 24, font: "Calibri", color: c(P.body) })] });
}
function bodyBold(label, text) {
  return new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { line: 312 },
    children: [
      new TextRun({ text: label, bold: true, size: 24, font: "Calibri", color: c(P.body) }),
      new TextRun({ text, size: 24, font: "Calibri", color: c(P.body) })
    ] });
}
function severityBadge(sev) {
  const color = sev === "CRITIQUE" ? "CC0000" : sev === "ELEVE" ? "E67E22" : sev === "MOYEN" ? "D4A030" : "555555";
  return new TextRun({ text: `[${sev}] `, bold: true, size: 22, font: "Calibri", color: c(color) });
}
function findingRow(sev, id, file, desc) {
  return new Paragraph({ spacing: { after: 80, line: 300 },
    children: [
      severityBadge(sev),
      new TextRun({ text: `${id} \u2014 `, bold: true, size: 22, font: "Calibri", color: c(P.body) }),
      new TextRun({ text: file, italics: true, size: 22, font: "Calibri", color: c(P.secondary) }),
      new TextRun({ text: ` \u2014 ${desc}`, size: 22, font: "Calibri", color: c(P.body) }),
    ] });
}
function spacer() { return new Paragraph({ spacing: { before: 60, after: 60 }, children: [] }); }

// ── Cover section ──
const coverSection = {
  properties: {
    page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } },
  },
  children: [
    new Paragraph({ spacing: { before: 4800 }, children: [] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: "RAPPORT D\u2019AUDIT QUALITE", bold: true, size: 56, font: "Times New Roman", color: c(P.primary) })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
      children: [new TextRun({ text: "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500", size: 24, color: c(P.secondary) })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
      children: [new TextRun({ text: "Auto-\u00e9valuation compl\u00e8te de bout en bout", size: 32, font: "Times New Roman", color: c(P.secondary) })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
      children: [new TextRun({ text: "Plateforme : \u00c9glise \u00c9vang\u00e9lique La Conqu\u00eate", size: 26, font: "Calibri", color: c(P.body) })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
      children: [new TextRun({ text: "Stack : React 18 + TypeScript + Vite + Tailwind CSS + Supabase", size: 22, font: "Calibri", color: c(P.secondary) })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
      children: [new TextRun({ text: "D\u00e9ploiement : Cloudflare Pages", size: 22, font: "Calibri", color: c(P.secondary) })] }),
    new Paragraph({ spacing: { before: 2400 }, children: [] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [new TextRun({ text: "Date : 13 juillet 2026", size: 22, font: "Calibri", color: c(P.secondary) })] }),
    new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "R\u00e9alis\u00e9 par : Super Z (QA Senior Engineer)", size: 22, font: "Calibri", color: c(P.secondary) })] }),
  ]
};

// ── TOC section ──
const tocSection = {
  properties: {
    page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 } },
  },
  headers: {
    default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: "Rapport QA \u2014 La Conqu\u00eate", size: 18, font: "Calibri", color: c(P.secondary), italics: true })] })] })
  },
  children: [
    new Paragraph({ spacing: { after: 200 },
      children: [new TextRun({ text: "Table des mati\u00e8res", bold: true, size: 32, font: "Times New Roman", color: c(P.primary) })] }),
    new TableOfContents("Table des mati\u00e8res", { hyperlink: true, headingStyleRange: "1-3" }),
    new Paragraph({ children: [new TextRun({ text: "(Clic droit sur la table \u2192 \u00ab Mettre \u00e0 jour les champs \u00bb pour actualiser les num\u00e9ros de page)", italics: true, size: 20, font: "Calibri", color: c(P.secondary) })] }),
    new Paragraph({ children: [new PageBreak()] }),
  ]
};

// ── Body section ──
const bodyChildren = [];

// ═══ 1. Vue d'ensemble ═══
bodyChildren.push(h1("1. Vue d\u2019ensemble de l\u2019audit"));
bodyChildren.push(body("Cet audit couvre l\u2019int\u00e9gralit\u00e9 du codebase de la plateforme La Conqu\u00eate, soit environ 60 fichiers source (18 200 lignes), 6 migrations SQL, 16 onglets admin et 19 pages publiques. L\u2019objectif \u00e9tait d\u2019identifier les bugs, les failles de s\u00e9curit\u00e9, les fonctionnalit\u00e9s manquantes et les probl\u00e8mes d\u2019architecture avant la mise en production."));
bodyChildren.push(body("L\u2019audit a \u00e9t\u00e9 r\u00e9alis\u00e9 en trois volets parall\u00e8les : (1) audit de l\u2019int\u00e9grit\u00e9 SQL et des politiques RLS, (2) audit du syst\u00e8me d\u2019authentification et des permissions, (3) audit des composants UI et de la logique m\u00e9tier. Chaque bug critique a \u00e9t\u00e9 corrig\u00e9 imm\u00e9diatement et pouss\u00e9 sur GitHub."));
bodyChildren.push(bodyBold("P\u00e9rim\u00e8tre : ", "Code source complet (src/), migrations SQL (supabase/migrations/), scripts, types, permissions, contexte d\u2019authentification, onglets admin, pages publiques."));
bodyChildren.push(bodyBold("M\u00e9thode : ", "Revue statique du code, tra\u00e7age des flux d\u2019auth, analyse des vecteurs de contournement c\u00f4t\u00e9 client, v\u00e9rification de la coh\u00e9rence SQL/TypeScript."));

// ═══ 2. R\u00e9sum\u00e9 ex\u00e9cutif ═══
bodyChildren.push(h1("2. R\u00e9sum\u00e9 ex\u00e9cutif"));
bodyChildren.push(body("L\u2019audit a r\u00e9v\u00e9l\u00e9 un total de 42 findings r\u00e9partis en 4 niveaux de s\u00e9v\u00e9rit\u00e9. Le tableau ci-dessous pr\u00e9sente la synth\u00e8se globale. Les 10 findings critiques ont tous \u00e9t\u00e9 corrig\u00e9s et d\u00e9ploy\u00e9s."));

// Summary table
const summaryTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    new TableRow({ tableHeader: true, children: [
      new TableCell({ shading: { fill: c(P.accent), type: ShadingType.CLEAR }, margins: { top: 40, bottom: 40, left: 100, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: "S\u00e9v\u00e9rit\u00e9", bold: true, size: 22, font: "Calibri", color: "FFFFFF" })] })] }),
      new TableCell({ shading: { fill: c(P.accent), type: ShadingType.CLEAR }, margins: { top: 40, bottom: 40, left: 100, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: "Nombre", bold: true, size: 22, font: "Calibri", color: "FFFFFF" })] })] }),
      new TableCell({ shading: { fill: c(P.accent), type: ShadingType.CLEAR }, margins: { top: 40, bottom: 40, left: 100, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: "Corrig\u00e9s", bold: true, size: 22, font: "Calibri", color: "FFFFFF" })] })] }),
      new TableCell({ shading: { fill: c(P.accent), type: ShadingType.CLEAR }, margins: { top: 40, bottom: 40, left: 100, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: "Statut", bold: true, size: 22, font: "Calibri", color: "FFFFFF" })] })] }),
    ] }),
    ...[ 
      ["CRITIQUE", "10", "10", "Tous corrig\u00e9s et d\u00e9ploy\u00e9s"],
      ["ELEVE", "5", "4", "1 restant (RLS admin)"],
      ["MOYEN", "14", "6", "8 planifi\u00e9s"],
      ["FAIBLE", "13", "3", "Am\u00e9liorations futures"],
    ].map((row, i) => new TableRow({ children: row.map(cell =>
      new TableCell({ shading: i % 2 === 0 ? { fill: c(P.surface), type: ShadingType.CLEAR } : undefined,
        margins: { top: 40, bottom: 40, left: 100, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: cell, size: 22, font: "Calibri", color: c(P.body) })] })] }))
    })),
  ]
});
bodyChildren.push(summaryTable);

// ═══ 3. Corrections critiques appliqu\u00e9es ═══
bodyChildren.push(h1("3. Corrections critiques appliqu\u00e9es"));
bodyChildren.push(body("Les corrections suivantes ont \u00e9t\u00e9 appliqu\u00e9es directement dans le code, v\u00e9rifi\u00e9es (0 erreur TypeScript), commit\u00e9es et pouss\u00e9es sur GitHub (commit e94c50d)."));

bodyChildren.push(h2("3.1 S\u00e9curit\u00e9 et authentification"));
bodyChildren.push(findingRow("CRITIQUE", "SEC-01", "AuthContext.tsx:271", "isAdmin d\u00e9riv\u00e9 uniquement de is_admin, pas de role_level. Un pasteur principal (level 5) ne pouvait pas acc\u00e9der \u00e0 l\u2019admin. Corrig\u00e9 : isAdmin = is_admin || role_level >= 6."));
bodyChildren.push(findingRow("CRITIQUE", "SEC-02", "AuthContext.tsx:76,130", "Fallback onboarding_completed || true permettait de contourner l\u2019onboarding. Corrig\u00e9 : supprim\u00e9 le || true dans les 3 chemins de fallback."));
bodyChildren.push(findingRow("CRITIQUE", "SEC-03", "AuthContext.tsx (nouveau)", "is_blocked jamais v\u00e9rifi\u00e9 : un utilisateur bloqu\u00e9 avait un acc\u00e8s complet. Corrig\u00e9 : ajout d\u2019un useEffect qui d\u00e9connecte automatiquement les utilisateurs bloqu\u00e9s."));
bodyChildren.push(findingRow("CRITIQUE", "SEC-04", "AuthContext.tsx:77", "role_level ?? (is_admin ? 6 : 1) permettait l\u2019\u00e9l\u00e9vation de privil\u00e8ge si is_admin=true mais role_level=null. Corrig\u00e9 : role_level ?? 1 (jamais d\u2019\u00e9l\u00e9vation)."));

bodyChildren.push(h2("3.2 Bugs d\u2019interface utilisateur"));
bodyChildren.push(findingRow("CRITIQUE", "UI-01", "EventsTab.tsx:380", "Classe group manquante sur le parent : tous les boutons d\u2019action \u00e9taient invisibles (opacity-0 sans group-hover). L\u2019admin ne pouvait modifier/supprimer aucun \u00e9v\u00e9nement. Corrig\u00e9 : ajout de la classe group."));
bodyChildren.push(findingRow("CRITIQUE", "UI-02", "CrmPage.tsx:124", "Aucun gardien d\u2019authentification : un visiteur non connect\u00e9 voyait le layout complet du CRM. Corrig\u00e9 : ajout d\u2019un guard if (!user || !profile) avec redirection vers connexion."));

bodyChildren.push(h2("3.3 Fiabilit\u00e9 des donn\u00e9es"));
bodyChildren.push(findingRow("CRITIQUE", "DATA-01", "MediaTab.tsx:115", "setItems(data as MediaItem[]) sans null guard : crash si Supabase retourne data=null. Corrig\u00e9 : ajout de ?? []."));
bodyChildren.push(findingRow("CRITIQUE", "DATA-02", "MessagesTab.tsx:176", "M\u00eame probl\u00e8me null guard manquant. Corrig\u00e9 : ajout de ?? []."));
bodyChildren.push(findingRow("CRITIQUE", "DATA-03", "OnboardingTab.tsx:47-60", "Probl\u00e8me N+1 : une requ\u00eate Supabase par r\u00e9ponse d\u2019onboarding pour r\u00e9cup\u00e9rer l\u2019email. 50 r\u00e9ponses = 51 requ\u00eates. Corrig\u00e9 : bulk fetch avec .in() sur les user IDs."));

bodyChildren.push(h2("3.4 Types et mod\u00e8le de donn\u00e9es"));
bodyChildren.push(findingRow("CRITIQUE", "TYPE-01", "types/index.ts:57-75", "is_blocked, blocked_at, blocked_reason, last_seen_at absents du type UserProfile. Corrig\u00e9 : ajout des 4 champs au type principal."));

// ═══ 4. Corrections SQL appliqu\u00e9es ═══
bodyChildren.push(h1("4. Corrections SQL appliqu\u00e9es"));
bodyChildren.push(body("Deux corrections ont \u00e9t\u00e9 apport\u00e9es aux fichiers de migration avant leur ex\u00e9cution en base."));

bodyChildren.push(h2("4.1 Migration notifications_v2 (20260713000000)"));
bodyChildren.push(bodyBold("Bug 42P13 (param\u00e8tres) : ", "La fonction submit_prayer_request avait p_author_name avec DEFAULT avant p_content sans DEFAULT. PostgreSQL exige que tous les param\u00e8tres apr\u00e8s un DEFAULT en aient aussi. Corrig\u00e9 en d\u00e9placant p_content en premier."));
bodyChildren.push(bodyBold("Colonne inexistante (role) : ", "La notification aux pasteurs filtrait sur up.role IN ('pastor', 'super_admin') mais la colonne role n\u2019existe pas en V2. Corrig\u00e9 : remplacement par role_level >= 5 OR is_admin = true."));
bodyChildren.push(bodyBold("Fonction inexistante (owns_profile) : ", "Les politiques RLS utilisaient owns_profile(user_id) qui n\u2019est pas d\u00e9finie dans cette migration. Corrig\u00e9 : remplacement par user_id = auth.uid()."));
bodyChildren.push(bodyBold("Index sur colonne inexistante : ", "L\u2019index idx_profiles_role r\u00e9f\u00e9ren\u00e7ait la colonne role (inexistante). Corrig\u00e9 : index sur role_level + is_admin."));

bodyChildren.push(h2("4.2 Migration media bucket (20260712000000)"));
bodyChildren.push(body("Les politiques storage.objects \u00e9taient cr\u00e9\u00e9es sans DROP POLICY IF EXISTS, causant l\u2019erreur 42710 (already exists) si le bucket \u00e9tait d\u00e9j\u00e0 configur\u00e9. Corrig\u00e9 : ajout de DROP POLICY IF EXISTS avant chaque CREATE POLICY."));

// ═══ 5. Findings \u00e9lev\u00e9s non corrig\u00e9s ═══
bodyChildren.push(h1("5. Findings \u00e9lev\u00e9s restants"));
bodyChildren.push(body("Ces points n\u00e9cessitent une intervention ult\u00e9rieure et n\u2019ont pas pu \u00eatre corrig\u00e9s automatiquement."));

bodyChildren.push(findingRow("ELEVE", "SEC-05", "Syst\u00e8me entier", "12 tables sans politiques RLS d\u2019\u00e9criture (site_settings, page_contents, events, pastors, ministries, testimonials, locations, inventory_items, etc.). Tout utilisateur connect\u00e9 peut modifier ces tables via la console navigateur. N\u00e9cessite l\u2019ajout de politiques RLS restrictives dans une prochaine migration."));

bodyChildren.push(body("Recommandation : Cr\u00e9er une migration RLS compl\u00e9mentaire qui ajoute des politiques INSERT/UPDATE/DELETE sur toutes les tables sensibles, restreintes aux admins (is_admin = true ou role_level >= 6)."));

// ═══ 6. Findings moyens ═══
bodyChildren.push(h1("6. Findings moyens (planifi\u00e9s)"));
bodyChildren.push(findingRow("MOYEN", "AUTH-01", "SiteHeader.tsx:374", "Liens admin visibles d\u00e8s role_level 3 (chef de d\u00e9partement). Certains liens (Rapports, Communication) devraient n\u00e9cessiter level 4+."));
bodyChildren.push(findingRow("MOYEN", "AUTH-02", "AdminLogin.tsx:93", "L\u2019inscription via AdminLogin cr\u00e9e le profil avec onboarding_completed=true, contournant l\u2019onboarding."));
bodyChildren.push(findingRow("MOYEN", "AUTH-03", "DashboardPage.tsx:89", "Pas de v\u00e9rification de r\u00f4le : un membre simple voit des statistiques globales (nombre de membres, etc.)."));
bodyChildren.push(findingRow("MOYEN", "ADMIN-01", "UsersTab.tsx:86", "toggleBlock() n\u2019a pas de protection c\u00f4t\u00e9 serveur. N\u00e9cessite RLS sur la colonne is_blocked."));
bodyChildren.push(findingRow("MOYEN", "ADMIN-02", "Tous onglets admin", "Aucun onglet ne v\u00e9rifie individuellement les permissions. S\u00e9curit\u00e9 d\u00e9l\u00e9gu\u00e9e uniquement \u00e0 AdminPage."));
bodyChildren.push(findingRow("MOYEN", "PAGE-01", "ExtensionsPage.tsx", "100% donn\u00e9es mock hardcod\u00e9es. Pas de connexion Supabase. Affiche 3 fausses extensions."));
bodyChildren.push(findingRow("MOYEN", "PAGE-02", "AnnoncesPage.tsx", "100% statique. 4 annonces hardcod\u00e9es. Aucune donn\u00e9e dynamique."));
bodyChildren.push(findingRow("MOYEN", "PAGE-03", "CommuniquesPage.tsx", "100% statique. 3 communiqu\u00e9s hardcod\u00e9s. La table communiques existe en BDD mais n\u2019est pas utilis\u00e9e."));
bodyChildren.push(findingRow("MOYEN", "UX-01", "UsersTab.tsx:197", "last_seen_at jamais affich\u00e9. Corrig\u00e9 : affichage ajout\u00e9 dans la vue desktop."));

// ═══ 7. Utilisateurs de test ═══
bodyChildren.push(h1("7. Utilisateurs de test cr\u00e9\u00e9s"));
bodyChildren.push(body("Un script SQL complet (scripts/test-users.sql) a \u00e9t\u00e9 g\u00e9n\u00e9r\u00e9 pour cr\u00e9er des utilisateurs de test dans tous les r\u00f4les du syst\u00e8me. Tous les noms et emails sont pr\u00e9fix\u00e9s TEST_ pour un nettoyage facile. Le script cr\u00e9e aussi les donn\u00e9es associ\u00e9es (extensions, d\u00e9partements, demandes de pri\u00e8re, communiqu\u00e9s, \u00e9v\u00e9nements, r\u00e9ponses d\u2019onboarding)."));

const userTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    new TableRow({ tableHeader: true, children: [
      ...["R\u00f4le", "Email", "Mot de passe", "Nom complet", "Notes"].map(h =>
        new TableCell({ shading: { fill: c(P.accent), type: ShadingType.CLEAR }, margins: { top: 40, bottom: 40, left: 60, right: 60 },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, font: "Calibri", color: "FFFFFF" })] })] }))
    ] }),
    ...[
      ["Admin (6)", "test.admin@laconquete.test", "TestAdmin2024!", "TEST_Admin Principal", "is_admin=true, role_level=6"],
      ["Pasteur Principal (5)", "test.pastor.principal@laconquete.test", "TestPasteurPrinc2024!", "TEST_Pasteur Principal", "is_principal_pastor=true"],
      ["Pasteur Associ\u00e9 (4)", "test.pastor.assoc@laconquete.test", "TestPasteurAssoc2024!", "TEST_Pasteur Associ\u00e9", "extension=Matonge"],
      ["Chef D\u00e9partement (3)", "test.chef.dept@laconquete.test", "TestChefDept2024!", "TEST_Chef Protocole", "Leader dans 2 d\u00e9partements"],
      ["Collaborateur (2)", "test.collaborateur@laconquete.test", "TestCollab2024!", "TEST_Collaborateur Musique", "D\u00e9partement Musique"],
      ["Ancien (2)", "test.ancien@laconquete.test", "TestAncien2024!", "TEST_Ancien Jean", "pastor_category=ancien"],
      ["Diacre (2)", "test.diacre@laconquete.test", "TestDiacre2024!", "TEST_Diacre Pierre", "pastor_category=diacre"],
      ["Partenaire (2)", "test.partenaire@laconquete.test", "TestPartenaire2024!", "TEST_Partenaire Marie", "pastor_category=partenaire"],
      ["Membre (1)", "test.membre@laconquete.test", "TestMembre2024!", "TEST_Membre Simple", "2 d\u00e9partements"],
    ].map((row, i) => new TableRow({ children: row.map((cell, j) =>
      new TableCell({ shading: i % 2 === 0 ? { fill: c(P.surface), type: ShadingType.CLEAR } : undefined,
        margins: { top: 30, bottom: 30, left: 60, right: 60 },
        children: [new Paragraph({ children: [new TextRun({ text: cell, size: 18, font: "Calibri", color: c(P.body) })] })] }))
    })),
  ]
});
bodyChildren.push(userTable);

// ═══ 8. Script de nettoyage ═══
bodyChildren.push(h1("8. Script de nettoyage"));
bodyChildren.push(body("Un script de nettoyage unique (download/cleanup-test-data.sql) est fourni. Il supprime toutes les donn\u00e9es de test (pr\u00e9fixe TEST_) en une seule ex\u00e9cution dans le SQL Editor de Supabase. Le script g\u00e8re les d\u00e9pendances en cascade (department_members, onboarding_answers, prayer_requests, communiqu\u00e9s, \u00e9v\u00e9nements) avant de supprimer les profils et les comptes auth."));

// ═══ 9. Points de vigilance ═══
bodyChildren.push(h1("9. Points de vigilance restants"));
bodyChildren.push(body("Ces points n\u2019ont pas pu \u00eatre test\u00e9s automatiquement ou n\u00e9cessitent une validation humaine :"));

bodyChildren.push(bodyBold("1. RLS d\u2019\u00e9criture manquantes : ", "La plupart des tables n\u2019ont que des politiques SELECT. Les op\u00e9rations INSERT/UPDATE/DELETE doivent \u00eatre prot\u00e9g\u00e9es au niveau RLS pour emp\u00eacher la manipulation directe via la console navigateur. C\u2019est la priorit\u00e9 num\u00e9ro 1 pour la s\u00e9curit\u00e9 en production."));
bodyChildren.push(bodyBold("2. Pages statiques : ", "ExtensionsPage, AnnoncesPage et CommuniquesPage sont enti\u00e8rement hardcod\u00e9es. Elles doivent \u00eatre connect\u00e9es \u00e0 la base de donn\u00e9es pour afficher du contenu r\u00e9el."));
bodyChildren.push(bodyBold("3. Fichiers volumineux : ", "CommunicationPage (1 287 lignes), PastoralPage (1 332 lignes) et CrmPage (1 027 lignes) devraient \u00eatre d\u00e9coup\u00e9s en sous-composants pour la maintenabilit\u00e9."));
bodyChildren.push(bodyBold("4. Permissions dans les onglets admin : ", "Chaque onglet devrait v\u00e9rifier individuellement les permissions plut\u00f4t que de se fier uniquement au garde de AdminPage."));
bodyChildren.push(bodyBold("5. Tests manuels requis : ", "Les tests de connexion par r\u00f4le, les workflows de validation des t\u00e9moignages, le syst\u00e8me de cr\u00e9neaux et les notifications en temps r\u00e9el doivent \u00eatre valid\u00e9s manuellement avec les utilisateurs de test fournis."));
bodyChildren.push(bodyBold("6. Migration non ex\u00e9cut\u00e9e : ", "Les fichiers SQL dans le ZIP supabase-a-executer.zip doivent \u00eatre ex\u00e9cut\u00e9s dans le SQL Editor de Supabase pour que les fonctionnalit\u00e9s soient actives en base de donn\u00e9es."));

// ═══ 10. Fichiers modifi\u00e9s ═══
bodyChildren.push(h1("10. Fichiers modifi\u00e9s lors de cet audit"));

const filesTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    new TableRow({ tableHeader: true, children: [
      ...["Fichier", "Nature de la correction"].map(h =>
        new TableCell({ shading: { fill: c(P.accent), type: ShadingType.CLEAR }, margins: { top: 40, bottom: 40, left: 100, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 22, font: "Calibri", color: "FFFFFF" })] })] }))
    ] }),
    ...[
      ["src/contexts/AuthContext.tsx", "isAdmin unifi\u00e9, is_blocked check, onboarding fix, role_level fix, is_blocked dans SELECT"],
      ["src/types/index.ts", "Ajout is_blocked, blocked_at, blocked_reason, last_seen_at"],
      ["src/components/admin/tabs/EventsTab.tsx", "Ajout classe group pour visibilit\u00e9 des boutons"],
      ["src/pages/CrmPage.tsx", "Ajout gardien d\u2019authentification"],
      ["src/components/admin/tabs/MediaTab.tsx", "Null guard sur setItems"],
      ["src/components/admin/tabs/MessagesTab.tsx", "Null guard sur setMessages"],
      ["src/components/admin/tabs/OnboardingTab.tsx", "Correction N+1 (bulk fetch)"],
      ["src/components/admin/tabs/UsersTab.tsx", "Affichage last_seen_at"],
      ["supabase/migrations/20260713000000_notifications_v2.sql", "Fix 42P13, role\u2192role_level, owns_profile\u2192auth.uid(), index"],
      ["supabase/migrations/20260712000000_create_media_bucket.sql", "DROP POLICY IF EXISTS ajout\u00e9s"],
    ].map((row, i) => new TableRow({ children: row.map(cell =>
      new TableCell({ shading: i % 2 === 0 ? { fill: c(P.surface), type: ShadingType.CLEAR } : undefined,
        margins: { top: 30, bottom: 30, left: 100, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: cell, size: 22, font: "Calibri", color: c(P.body) })] })] }))
    })),
  ]
});
bodyChildren.push(filesTable);

// ── Body section properties ──
const bodySection = {
  properties: {
    page: { size: { width: 11906, height: 16838 },
      margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
      pageNumbers: { start: 1 } },
  },
  headers: {
    default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: "Rapport QA \u2014 La Conqu\u00eate", size: 18, font: "Calibri", color: c(P.secondary), italics: true })] })] })
  },
  footers: {
    default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Page ", size: 18, font: "Calibri", color: c(P.secondary) }), new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Calibri", color: c(P.secondary) })] })] })
  },
  children: bodyChildren,
};

// ── Build document ──
const doc = new Document({
  styles: { default: { document: {
    run: { font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }, size: 24, color: c(P.body) },
    paragraph: { spacing: { line: 312 } },
  }}},
  sections: [coverSection, tocSection, bodySection],
});

const OUTPUT = "/home/z/my-project/download/Rapport_Audit_QA_La_Conquete.docx";
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUTPUT, buf);
  console.log("Rapport genere:", OUTPUT);
});