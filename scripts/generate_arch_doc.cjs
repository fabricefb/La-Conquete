const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  PageOrientation, TableOfContents, SectionType, PageBreak,
} = require("docx");
const fs = require("fs");
const { imageSize } = require("image-size");
const path = require("path");

// ═══════════════════════════════════════════════════════════════
//  PALETTE — DM-1 (Deep Cyan) — Tech / Architecture
// ═══════════════════════════════════════════════════════════════
const P = {
  bg: "162235", primary: "FFFFFF", accent: "37DCF2",
  body: "1E293B", secondary: "5A6080", surface: "F0F6FA",
  cover: { titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078" },
  table: { headerBg: "1B6B7A", headerText: "FFFFFF", accentLine: "1B6B7A", innerLine: "C8DDE2", surface: "EDF3F5" },
};
const c = (hex) => hex.replace("#", "");

// ═══════════════════════════════════════════════════════════════
//  BORDERS
// ═══════════════════════════════════════════════════════════════
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

// ═══════════════════════════════════════════════════════════════
//  IMAGE LOADER
// ═══════════════════════════════════════════════════════════════
const IMG_DIR = "/home/z/my-project/download/";
function loadImg(filename) {
  const buf = fs.readFileSync(path.join(IMG_DIR, filename));
  const dims = imageSize(buf);
  return { data: buf, width: dims.width, height: dims.height };
}

// ═══════════════════════════════════════════════════════════════
//  COMPONENT BUILDERS
// ═══════════════════════════════════════════════════════════════
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 200 },
    children: [new TextRun({ text, bold: true, size: 32, color: c(P.body), font: { ascii: "Liberation Sans" } })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, size: 28, color: c(P.body), font: { ascii: "Liberation Sans" } })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24, color: c(P.secondary), font: { ascii: "Liberation Sans" } })],
  });
}
function body(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: 120 },
    indent: opts.noIndent ? undefined : { firstLine: 420 },
    children: [new TextRun({ text, size: 22, color: "000000", font: { ascii: "Liberation Serif" }, ...opts })],
  });
}
function bodyRuns(runs, opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: opts.after || 120 },
    indent: opts.noIndent ? undefined : { firstLine: 420 },
    children: runs,
  });
}
function bold(text) {
  return new TextRun({ text, bold: true, size: 22, color: "000000", font: { ascii: "Liberation Serif" } });
}
function normal(text) {
  return new TextRun({ text, size: 22, color: "000000", font: { ascii: "Liberation Serif" } });
}
function code(text) {
  return new TextRun({ text, size: 20, color: "1B6B7A", font: { ascii: "Liberation Mono" } });
}
function emptyPara() {
  return new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "", size: 12 })] });
}

function imageBlock(filename, maxWidthDxa = 8500) {
  const img = loadImg(filename);
  const ratio = img.height / img.width;
  const displayW = Math.min(maxWidthDxa, img.width * 2);
  const displayH = Math.round(displayW * ratio);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
    children: [new ImageRun({ data: img.data, transformation: { width: displayW / 20, height: displayH / 20 }, type: "png" })],
  });
}

function caption(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 240 },
    children: [new TextRun({ text, size: 18, color: c(P.secondary), font: { ascii: "Liberation Serif" }, italics: true })],
  });
}

// Table builder
function buildTable(headers, rows, colWidths) {
  const totalPct = colWidths.reduce((a, b) => a + b, 0);
  const pctWidths = colWidths.map(w => Math.round(w / totalPct * 100));

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      width: { size: pctWidths[i], type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: P.table.headerBg },
      borders: { top: NB, bottom: { style: BorderStyle.SINGLE, size: 2, color: c(P.table.accentLine) }, left: NB, right: NB },
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, size: 20, color: P.table.headerText, font: { ascii: "Liberation Sans" } })] })],
    })),
  });

  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => new TableCell({
      width: { size: pctWidths[ci], type: WidthType.PERCENTAGE },
      shading: ri % 2 === 0 ? { type: ShadingType.CLEAR, fill: P.table.surface } : { type: ShadingType.CLEAR, fill: "FFFFFF" },
      borders: { top: NB, bottom: { style: BorderStyle.SINGLE, size: 1, color: c(P.table.innerLine) }, left: NB, right: NB },
      margins: { top: 50, bottom: 50, left: 100, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text: String(cell), size: 20, color: "000000", font: { ascii: "Liberation Serif" } })] })],
    })),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: { type: "fixed" },
    borders: { top: { style: BorderStyle.SINGLE, size: 2, color: c(P.table.accentLine) }, bottom: { style: BorderStyle.SINGLE, size: 2, color: c(P.table.accentLine) }, left: NB, right: NB, insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: c(P.table.innerLine) }, insideVertical: NB },
    rows: [headerRow, ...dataRows],
  });
}

// SQL code block
function sqlBlock(text) {
  const lines = text.split("\n");
  return new Paragraph({
    spacing: { before: 120, after: 200, line: 260 },
    indent: { left: 400 },
    children: lines.map((line, i) => new TextRun({
      text: i < lines.length - 1 ? line + "\n" : line,
      size: 17, color: "1B6B7A", font: { ascii: "Liberation Mono" },
      break: i > 0 ? 1 : undefined,
    })),
  });
}

// ═══════════════════════════════════════════════════════════════
//  COVER — R1 (Pure Paragraph Left) with DM-1 palette
// ═══════════════════════════════════════════════════════════════
function buildCover() {
  const padL = 1200, padR = 800;
  const title = "Architecture Technique Church ERP";
  const subtitle = "La Conquete — Systeme de Gestion d'Eglise & Reseau Social Interne";
  const englishLabel = "TECHNICAL ARCHITECTURE DOCUMENT";
  const metaLines = [
    "Projet : Eglise Evangelique La Conquete",
    "Version : 1.0 — Juillet 2026",
    "Technologies : Supabase (PostgreSQL + RLS) | React + Vite | TypeScript",
  ];

  // Dynamic title sizing
  const availableWidth = 11906 - padL - padR - 300;
  const charWidth = (pt) => pt * 11; // Latin chars
  const charsPerLine = (pt) => Math.floor(availableWidth / charWidth(pt));
  let titlePt = 36;
  let titleLines = [title];
  while (titlePt >= 24) {
    const cpl = charsPerLine(titlePt);
    if (title.length <= cpl || cpl < 2) break;
    // Simple split at spaces
    const words = title.split(" ");
    const lines = [];
    let current = "";
    for (const w of words) {
      if ((current + " " + w).trim().length > cpl) { lines.push(current.trim()); current = w; }
      else current = (current + " " + w).trim();
    }
    if (current) lines.push(current);
    titleLines = lines;
    if (lines.length <= 2) break;
    titlePt -= 2;
  }
  const titleSize = titlePt * 2;

  // Dynamic spacing (capped at 4800 for safety)
  const contentH = titleLines.length * (titlePt * 23 + 200) + 800 + metaLines.length * 260 + 600 + 600;
  const remaining = Math.max(15638 - contentH, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(remaining * 0.45);
  const rawBottom = Math.floor(remaining * 0.45);
  const topSpacing = Math.min(rawTop, 4800);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);

  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: c(P.accent), space: 12 };
  const children = [];

  children.push(new Paragraph({ spacing: { before: topSpacing } }));

  // English label
  children.push(new Paragraph({
    indent: { left: padL, right: padR }, spacing: { after: 500 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: c(P.accent), space: 8 } },
    children: [new TextRun({ text: englishLabel.split("").join("  "), size: 18, color: c(P.accent), font: { ascii: "Liberation Sans" }, characterSpacing: 40 })],
  }));

  // Title
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true, color: P.cover.titleColor, font: { ascii: "Liberation Sans" } })],
    }));
  }

  // Subtitle
  children.push(new Paragraph({
    indent: { left: padL }, spacing: { after: 800 },
    children: [new TextRun({ text: subtitle, size: 24, color: P.cover.subtitleColor, font: { ascii: "Liberation Sans" } })],
  }));

  // Meta lines
  for (const line of metaLines) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({ text: line, size: 22, color: P.cover.metaColor, font: { ascii: "Liberation Sans" } })],
    }));
  }

  children.push(new Paragraph({ spacing: { before: bottomSpacing } }));

  // Footer
  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: c(P.accent), space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: "Confidentiel — Usage interne", size: 16, color: P.cover.footerColor, font: { ascii: "Liberation Sans" } }),
      new TextRun({ text: "                                        " }),
      new TextRun({ text: "Juillet 2026", size: 16, color: P.cover.footerColor, font: { ascii: "Liberation Sans" } }),
    ],
  }));

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: { type: "fixed" },
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({ shading: { type: ShadingType.CLEAR, fill: c(P.bg) }, borders: noBorders, children })],
    })],
  })];
}

// ═══════════════════════════════════════════════════════════════
//  TOC SECTION
// ═══════════════════════════════════════════════════════════════
function buildTocSection() {
  return {
    properties: {
      type: SectionType.NEXT_PAGE,
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
        pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN },
      },
    },
    headers: {
      default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Architecture Technique — Church ERP La Conquete", size: 16, color: c(P.secondary), font: { ascii: "Liberation Sans" }, italics: true })] })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PAGE  \\* ROMAN  \\* MERGEFORMAT", size: 16, color: c(P.secondary), font: { ascii: "Liberation Sans" } })] })] }),
    },
    children: [
      new Paragraph({ spacing: { before: 200, after: 400 }, children: [new TextRun({ text: "Table des Matieres", size: 36, bold: true, color: "000000", font: { ascii: "Liberation Sans" } })] }),
      new TableOfContents("Table des Matieres", {
        hyperlink: true, headingStyleRange: "1-3",
      }),
      new Paragraph({ spacing: { before: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Note : Cliquez avec le bouton droit sur la table des matieres, puis selectionnez \"Mettre a jour les champs\" pour actualiser les numeros de page.", size: 18, color: c(P.secondary), font: { ascii: "Liberation Serif" }, italics: true })] }),
      new Paragraph({ children: [new PageBreak()] }),
    ],
  };
}

// ═══════════════════════════════════════════════════════════════
//  BODY CONTENT
// ═══════════════════════════════════════════════════════════════
function buildBody() {
  const content = [];

  // ─── SECTION 1: Resume Executif ───────────────────────────
  content.push(h1("1. Resume Executif"));
  content.push(body("Ce document presente l'architecture technique complete du systeme Church ERP pour l'Eglise Evangelique La Conquete. Il s'agit d'un systeme de gestion d'eglise combine a un reseau social interne, fonde sur une hierarchie de roles a quatre niveaux (Visiteur, Membre, Serviteur, Chef/Pasteur) avec un Super-Admin comme gardien ultime des droits. L'objectif est de fournir une analyse approfondie du modele de donnees, de la securite RLS (Row Level Security), du flux d'inscription progressif, et des arbitrages techniques a effectuer avant la premiere migration SQL en production."));
  content.push(body("Le systeme est construit sur Supabase (PostgreSQL + Auth + Storage), avec un frontend React + Vite deploie sur Cloudflare Pages. Le choix de Supabase offre un avantage strategique considerable : les Row Level Policies permettent de gerer la securite directement au niveau de la base de donnees, ce qui signifie que meme si un client contournait les verifications frontend, les donnees restent protegees. Cette approche \"security by default\" est particulierement adaptee a un contexte ecclesiastique ou la confidentialite des demandes de priere et des informations personnelles des membres est primordiale."));
  content.push(body("L'architecture existante comprend deja 12 tables ERP (en plus des 9 tables CMS du site public), un systeme complet de fonctions RLS helper (is_super_admin, is_pastor_or_above, is_chief_of, etc.), 8 departements pre-seeds avec leurs positions, et un composant d'onboarding multi-etapes. Ce document analyse ces fondations, identifie les points d'amelioration, et propose un schema SQL complementaire ainsi qu'un plan d'action concret pour la phase d'implementation."));

  // ─── SECTION 2: Etat Actuel ───────────────────────────────
  content.push(h1("2. Etat Actuel du Systeme"));
  content.push(body("Le projet La Conquete dispose deja d'une base solide avec deux vagues de migrations SQL. La premiere migration (full_schema.sql) a etabli le socle CMS : gestion des contenus de pages, des parametres du site, des lieux de culte, des evenements, des ministeres, des medias, des temoignages et des messages de contact. La seconde migration (erp_roles.sql) a ajoute la couche ERP complete avec les 12 tables operationnelles, les politiques RLS et les donnees de reference."));

  content.push(h2("2.1 Tables Existantes — Vue d'Ensemble"));
  content.push(body("Le schema actuel comprend 21 tables au total, divisees en deux categories fonctionnelles. Le CMS (9 tables) gere le site public : user_profiles, site_settings, page_contents, locations, events, ministries, media_items, testimonials, contact_messages. L'ERP (12 tables) gere la communaute interne : departments, positions, department_members, role_requests, prayer_requests, daily_thoughts, service_plannings, service_assignments, department_posts, post_comments, visitor_followups, notification_preferences. Cette separation claire entre le site public et l'espace communautaire est un choix architectural sain qui facilite les evolutions independantes."));

  content.push(imageBlock("diag_data_model.png", 9000));
  content.push(caption("Figure 1 — Modele de donnees du schema ERP (12 tables operationnelles)"));

  content.push(h2("2.2 Systeme de Roles — ENUM user_role"));
  content.push(body("Les roles sont implementes via un type ENUM PostgreSQL avec six valeurs ordonnees : visitor, member, servant, chief, pastor, super_admin. Ce choix a ete fait consciemment et presente des avantages et inconvenients specifiques que nous analyserons en profondeur dans la section 3.1. Le role est stocke directement dans la table user_profiles, ce qui signifie qu'un profil ne peut avoir qu'un seul role actif a la fois. Cette contrainte simplifie considerablement les politiques RLS mais pose la question de la polyvalence (un serviteur qui serait aussi chef d'un autre departement)."));

  content.push(imageBlock("diag_roles_hierarchy.png", 7500));
  content.push(caption("Figure 2 — Hierarchie des roles avec flux de validation"));

  content.push(h2("2.3 Fonctions Helper RLS Existantes"));
  content.push(body("Le schema inclut 7 fonctions SECURITY DEFINER qui servent de briques de base pour toutes les politiques RLS. Chacune est concue pour etre composee avec les autres, creant un systeme de securite modulaire et lisible. is_super_admin() verifie si l'utilisateur courant est super_admin. is_pastor_or_above() inclut pastor et super_admin. is_chief_or_above() inclut chief, pastor et super_admin. is_member_or_above() exclut uniquement les visiteurs. is_logged_in() verifie simplement que l'utilisateur est authentifie. owns_profile(p_id) verifie que l'utilisateur est le proprietaire du profil. Enfin, is_chief_of(dept_id) et belongs_to_dept(dept_id) verifient l'appartenance a un departement specifique."));

  // ─── SECTION 3: Modele de Donnees ────────────────────────
  content.push(h1("3. Modele de Donnees — Analyse et Recommandations"));
  content.push(body("Cette section aborde les decisions structurantes du modele de donnees. Pour chaque point, nous presentons les options disponibles, leurs consequences, et notre recommandation eclairee pour le stade MVP du Church ERP."));

  content.push(h2("3.1 ENUM vs Table Referentiel pour les Roles"));
  content.push(body("Deux approches s'offrent a nous pour stocker les roles : un type ENUM PostgreSQL ou une table roles referencee par cle etrangere. Chaque approche a des implications profondes sur la flexibilite, la performance et la maintenabilite du systeme. Il est crucial de comprendre les tradeoffs avant de commit sur l'une ou l'autre."));

  content.push(h3("Option A : ENUM PostgreSQL (choix actuel)"));
  content.push(body("L'ENUM est la solution actuelle. Son avantage principal est la simplicite : un ALTER TABLE user_profiles ADD COLUMN role user_role suffit. Les CHECK constraints sont automatiques, les performances de comparaison sont optimales (comparaison d'entiers sous le capot), et la lisibilite des policies RLS est excellente. L'inconvenient majeur est la rigidite : ajouter un nouveau role necessite ALTER TYPE ... ADD VALUE, qui verrouille la table et ne peut pas etre fait dans une transaction. Pour un MVP avec 6 roles fixes, c'est acceptable. Pour un systeme en evolution rapide, cela peut devenir un frein."));

  content.push(h3("Option B : Table roles referencee"));
  content.push(body("Une table roles avec id, name, level (pour la hierarchie), permissions (JSONB) offrirait une flexibilite maximale. Ajouter un role serait un simple INSERT. Les permissions pourraient etre granulaires. Cependant, cela complique significativement les politiques RLS : chaque policy devrait JOIN sur la table roles, et la verification de la hierarchie necessiterait des subqueries ou des fonctions supplementaires. Pour un MVP, c'est de l'ingenierie prematuree."));

  content.push(h3("Recommandation"));
  content.push(body("Garder l'ENUM pour le MVP. Les 6 roles actuels couvrent tous les cas d'usage identifie. Si dans 6-12 mois un besoin de role personnalise emerge (par exemple, \"coordinateur regional\" ou \"formateur\"), migrer vers une table referentiel sera un refactoring maitrise. La migration ENUM vers table est bien documentee dans PostgreSQL et peut se faire sans interruption de service. Ne pas investir dans cette complexite avant d'en avoir le besoin reel est un principe fondamental d'ingenierie lean."));

  content.push(h2("3.2 Relation Serviteur + Departement + Position"));
  content.push(body("La question centrale est : un serviteur peut-il servir dans plusieurs departements simultanement ? Par exemple, Jean est musicien dans le departement Louange ET cadreur dans le departement Medias. Le schema actuel repond OUI a cette question grace a la table department_members avec la contrainte UNIQUE(user_id, department_id). Cela signifie qu'un utilisateur peut avoir une entree par departement, chacune avec son propre position_id."));

  content.push(body("Cette conception est elegante et correcte pour les cas d'usage ecclesiastiques. La contrainte UNIQUE empeche un utilisateur d'etre inscrit deux fois dans le meme departement, tout en permettant la multi-appartenance. Le position_id nullable dans department_members permet egalement d'etre membre d'un departement sans position specifique (simple interesse ou en formation)."));

  content.push(body("Cependant, un point d'attention subsiste : le role dans user_profiles est global. Si Jean est servant du departement Louange, son role est 'servant' globalement, meme s'il n'est que 'member' dans le departement Medias. Cela signifie que la notion de role est decoupee en deux dimensions : le role global (pour les permissions systeme) et l'appartenance departementale (pour le contexte fonctionnel). Cette dualite est acceptable tant qu'elle est comprise et documentee."));

  content.push(h2("3.3 Champs Preparatoires pour les Fonctionnalites Avancees"));
  content.push(body("Le schema actuel inclut deja plusieurs champs anticipant les fonctionnalites avancees : is_anonymous et is_confidential sur prayer_requests permettent l'anonymat optionnel et la confidentialite pastorale. status ('pending'/'approved'/'rejected') sur role_requests avec reviewed_by et admin_note preparent le systeme d'approbation. status ('pending'/'contacted'/'returned'/'lost') sur visitor_followups avec assigned_to et contact_date implémentent le suivi des visiteurs. Ces champs sont bien penses et couvrent les besoins decrits dans le cahier des charges."));

  content.push(body("Toutefois, certains champs manquent pour les tableaux de bord differencies. L'indicateur de \"Sante de l'Eglise\" du pasteur necessiterait des donnees agregats (nombre de visiteurs par semaine, taux d'engagement, departements en sous-effectif). Nous recommandons d'ajouter un champ joined_via (texte) a user_profiles pour tracer comment chaque membre a decouvert l'eglise (bouche-a-oreille, reseaux sociaux, evenement, etc.), et un champ membership_date (date) distinct de created_at pour distinguer la date d'inscription technique de la date d'adhesion officielle validee par le pasteur."));

  content.push(h2("3.4 Tables Manquantes Proposees"));
  content.push(body("Apres analyse approfondie, nous recommandons l'ajout de trois tables complementaires pour le MVP. Ces tables ne sont pas critiques pour le lancement initial mais deviendront necessaires des les premiers mois d'utilisation. Les proposer des maintenant evite des migrations de schema chaotiques plus tard."));

  content.push(buildTable(
    ["Table", "Purpose", "Priorite", "Complexite"],
    [
      ["notifications", "File de notifications in-app (priere priee, service assigne, role approuve)", "Haute", "Faible"],
      ["attendance", "Presence aux cultes et evenements (pour indicateur sante eglise)", "Moyenne", "Moyenne"],
      ["growth_milestones", "Etapes de croissance spirituelle (nouveau converti, bapteme, formation)", "Basse", "Faible"],
    ],
    [30, 50, 10, 10],
  ));
  content.push(caption("Tableau 1 — Tables complementaires recommandees"));

  // ─── SECTION 4: Securite RLS ──────────────────────────────
  content.push(h1("4. Securite RLS — Analyse Profonde"));
  content.push(body("La Row Level Security est le coeur de la strategie de securite du Church ERP. Contrairement a une approche ou la securite est geree uniquement dans l'application frontend, les policies RLS de Supabase operent directement dans PostgreSQL, ce qui signifie que toute requete non autorisee est rejetee au niveau de la base de donnees, independamment du client qui l'emet. Cette section analyse les politiques existantes, identifie les faiblesses potentielles, et recommande des ameliorations."));

  content.push(imageBlock("diag_rls_matrix.png", 9000));
  content.push(caption("Figure 3 — Matrice de securite RLS : droits d'acces par role et table"));

  content.push(h2("4.1 Architecture des Fonctions Helper"));
  content.push(body("Les 7 fonctions SECURITY DEFINER forment une pyramide de permissions. A la base, is_logged_in() et owns_profile() fournissent les verifications elementaires. Au milieu, belongs_to_dept() et is_chief_of() ajoutent la dimension departementale. Au sommet, is_member_or_above(), is_chief_or_above(), is_pastor_or_above() et is_super_admin() implementent la hierarchie verticale. Le choix de SECURITY DEFINER est essentiel : il permet a ces fonctions de lire la table user_profiles (qui est elle-meme protegee par RLS) sans etre bloquees par les propres policies de la table. C'est un mecanisme PostgreSQL puissant mais qu'il faut comprendre pour eviter les erreurs."));

  content.push(body("Une question fondamentale se pose : vaut-il mieux des fonctions SECURITY DEFINER ou des policies SQL directes ? Les fonctions offrent une meilleure lisibilite et reutilisabilite. Au lieu de repeter la meme sous-requete dans chaque policy, on appelle is_chief_of(department_id). L'inconvenient est une micro-lenteur supplementaire (un appel de fonction par ligne evaluee), mais pour une eglise de quelques centaines de membres, c'est negligeable. Notre recommandation est claire : garder les fonctions helper, elles sont le bon choix pour ce projet."));

  content.push(h2("4.2 Analyse des Policies Critiques"));
  content.push(body("Examinons les policies les plus sensibles du systeme. Pour les prayer_requests, la policy actuelle autorise l'utilisateur a voir ses propres requetes, les pasteurs a voir toutes les requetes (y compris confidentielles), et les chefs a voir uniquement les non-confidentielles. C'est un bon equilibre. Cependant, un point d'attention : un visiteur non authentifie ne peut pas soumettre de requete de priere car la policy INSERT exige is_logged_in(). Si l'objectif est de permettre aux visiteurs anonymes de soumettre des requetes, il faut soit creer un endpoint RPC (Remote Procedure Call) avec SECURITY DEFINER, soit ajuster la policy."));

  content.push(body("Pour les department_posts, la policy SELECT autorise les membres du departement, les pasteurs et l'auteur a voir les publications. C'est correct. Mais la policy INSERT autorise belongs_to_dept() OR is_chief_of() OR is_pastor_or_above(), ce qui signifie qu'un simple membre du departement peut publier. Si l'objectif est que seuls les chefs et pasteurs peuvent publier des annonces officielles, il faut restreindre cette policy. Cependant, si le fil d'actualite doit etre collaboratif (style reseau social interne), la policy actuelle est appropriee. C'est un choix fonctionnel a trancher."));

  content.push(h2("4.3 Failles Potentielles et Corrections"));

  content.push(buildTable(
    ["Risque", "Gravite", "Status Actuel", "Correction Recommandee"],
    [
      ["Anonyme ne peut pas soumettre de priere", "Moyen", "INSERT exige is_logged_in()", "Creer un RPC SECURITY DEFINER pour les requetes anonymes"],
      ["Chef voit tous les posts (pas juste son dept)", "Faible", "is_pastor_or_above() est global", "Ajouter filtre is_chief_of(department_id) pour les chefs non-pasteur"],
      ["Pas de soft-delete sur les tables critiques", "Faible", "DELETE permanent", "Ajouter deleted_at + filtre WHERE deleted_at IS NULL dans les policies"],
      ["Pas de rate-limiting sur les requetes", "Moyen", "Non implemente", "Ajouter created_at + CHECK dans le frontend (max 3/heure)"],
      ["service_assignments : sous-requete dans policy", "Faible", "Fonctionne mais couteux", "Creer un index sur service_plannings(department_id)"],
    ],
    [25, 10, 30, 35],
  ));
  content.push(caption("Tableau 2 — Audit de securite RLS : risques et corrections"));

  // ─── SECTION 5: Flux d'Inscription ────────────────────────
  content.push(h1("5. Flux d'Inscription Progressif"));
  content.push(body("Le flux d'inscription est l'un des moments les plus critiques de l'experience utilisateur. Trop de champs a l'inscription et les visiteurs abandonnent. Trop peu et les donnees sont incompletes pour le suivi pastoral. L'objectif est de trouver le juste milieu entre la friction minimale et la richesse des donnees collectees, en echelonnant la collecte d'informations sur plusieurs interactions plutot qu'en un seul formulaire monolithique."));

  content.push(imageBlock("diag_registration_flow.png", 9000));
  content.push(caption("Figure 4 — Flux d'inscription progressif avec points de validation"));

  content.push(h2("5.1 Principes UX Fondamentaux"));
  content.push(body("Le premier principe est la progression naturelle. Un visiteur qui arrive sur le site ne doit pas etre confronte a un formulaire d'inscription avant d'avoir ressenti la valeur du site. Il doit pouvoir consulter la page d'accueil, lire les pensees du jour, ecouter des sermons, et seulement ensuite etre invite a s'inscrire pour des fonctionnalites exclusives (demande de priere, commentaires, agenda personnalise). Le deuxieme principe est la collecte differree. Ne demander une information que lorsque le systeme en a reellement besoin. Le troisieme principe est la transparence des transitions de role. L'utilisateur doit comprendre clairement ce que chaque role lui apporte et ce que l'approbation implique."));

  content.push(h2("5.2 Etapes Detaillees du Flux"));

  content.push(h3("Etape 1 : Inscription minimale (0 friction)"));
  content.push(body("L'inscription initiale ne demande que deux choses : email et mot de passe. C'est le strict minimum pour creer un compte Supabase Auth. Le trigger on_auth_user_created se declenche automatiquement et cree le profil user_profiles avec role = 'visitor' par defaut. Aucune autre information n'est requise a ce stade. L'utilisateur peut immediatement commencer a utiliser les fonctionnalites de visiteur : lire les pensees du jour, consulter l'agenda public, et soumettre des demandes de priere."));

  content.push(h3("Etape 2 : Complement de profil (profil de base)"));
  content.push(body("Apres la premiere connexion, un onboarding leger invite l'utilisateur a completer son profil : nom complet, telephone, genre. Ces champs sont optionnels mais fortement encourages. Le systeme peut afficher un bandeau non-intrusif \"Completez votre profil pour mieux connaitre la communaute\" plutot qu'un modal bloquant. Cette etape peut egalement etre differee : l'utilisateur peut la completer a tout moment depuis ses parametres. Le champ birth_date peut etre demande ici ou plus tard selon les besoins pastoraux."));

  content.push(h3("Etape 3 : Expression d'interets (departements)"));
  content.push(body("L'utilisateur est invite a selectionner les departements qui l'interessent. Cette selection ne cree pas d'inscription au departement mais alimente les preferences de l'utilisateur. Le systeme peut ensuite proposer des publications et evenements pertinents en fonction de ces interets. C'est une etape d'engagement doux qui prepare la transition vers le role de membre ou serviteur sans pression."));

  content.push(h3("Etape 4 : Demande de role Membre"));
  content.push(body("Deux approches sont possibles ici. L'approche automatique : apres completion du profil de base (etape 2) et un delai de probation (par exemple, 7 jours apres l'inscription), le systeme propose automatiquement a l'utilisateur de devenir membre. L'approche manuelle : l'utilisateur fait une demande explicite via un formulaire avec une courte motivation. Notre recommandation pour le MVP est l'approche automatique avec un delai de 3 jours et une confirmation par l'utilisateur. Cela reduit la charge administrative tout en maintenant un filtre minimal."));

  content.push(h3("Etape 5 : Demande de role Serviteur"));
  content.push(body("Ici, la friction est intentionnellement plus elevee. L'utilisateur doit selectionner un departement, une position, et rediger une motivation. Cette demande passe obligatoirement par la file d'approbation du Super-Admin. Le formulaire doit etre clair sur les attentes : \"En devenant serviteur, vous vous engagez a participer activement aux activites de votre departement\". La demande reste en status 'pending' jusqu'a validation ou refus par le Super-Admin, qui peut ajouter une note admin pour expliquer sa decision."));

  content.push(h2("5.3 Gestion des Transitions de Role"));
  content.push(body("Les transitions de role suivent un flux strictement unidirectionnel pour les roles inferieurs (visitor vers member), et un flux d'approbation pour les roles superieurs (member vers servant, servant vers chief). La transition visitor vers member peut etre automatique (apres completion du profil) ou manuelle (sur demande). La transition member vers servant necessite obligatoirement l'approbation du Super-Admin. La transition servant vers chief est egalement soumise a approbation mais avec un seuil plus eleve (le Super-Admin verifiera l'anciennete et l'engagement du serviteur). Les transitions pastor et super_admin sont_reservees exclusivement au Super-Admin actuel et ne font l'objet d'aucun formulaire public."));

  content.push(h2("5.4 Points de Friction : Utiles vs Inutiles"));
  content.push(body("La friction est un outil UX puissant quand elle est bien placee. Demander une motivation pour devenir serviteur est une friction utile : elle filtre les demandes non serieuses et donne au Super-Admin un contexte pour sa decision. En revanche, exiger la completion du profil avant de pouvoir lire les pensees du jour est une friction inutile : cela bloque l'engagement sans apporter de valeur. Le principe directeur est simple : la friction doit etre proportionnelle au niveau de responsabilite et d'acces demande. Plus le role est eleve, plus la friction est justifiee."));

  // ─── SECTION 6: Tableaux de Bord ──────────────────────────
  content.push(h1("6. Tableaux de Bord Differencies par Role"));
  content.push(body("L'un des aspects les plus innovants du systeme est la personnalisation complete du tableau de bord en fonction du role. Chaque profil utilisateur voit un espace adapte a ses responsabilites et a ses besoins specifiques. Cette approche evite la surcharge d'information et concentre l'attention de chacun sur ce qui compte reellement pour lui. Le pasteur voit un tableau de berger, le chef un tableau de manager, et les membres un espace communautaire."));

  content.push(imageBlock("diag_dashboards.png", 9500));
  content.push(caption("Figure 5 — Trois tableaux de bord differencies par role"));

  content.push(h2("6.1 Tableau de Bord du Pasteur (Le Berger)"));
  content.push(body("Le tableau de bord du pasteur est le plus riche en information. Il se compose de quatre widgets principaux. Premierement, le flux des requetes de priere : un ecran defilant ou chaque demande apparait avec le nom de l'auteur (ou \"Anonyme\" si is_anonymous = true), la date, et un bouton \"J'ai prie pour cela\". Lorsque le pasteur clique sur ce bouton, le champ prayed_by est mis a jour avec son ID, prayed_by est enregistre, et le status passe a 'praying'. Une notification discretement envoyee informe le membre : \"Le Pasteur [Nom] a prie pour votre requete aujourd'hui\". Ce feedback est un element pastoral puissant qui renforce le lien entre le berger et le troupeau."));
  content.push(body("Deuxiemement, le generateur de Pensée du Jour offre au pasteur un formulaire simple : un champ pour la reference biblique (ex: \"Psaume 23:1\"), un champ pour le texte du verset, et un champ pour la reflexion personnelle. En cliquant sur \"Publier\", la pensee apparait instantanement sur la page d'accueil de tous les utilisateurs. Troisiemement, l'indicateur de Sante de l'Eglise affiche des metriques cles : nombre de nouveaux visiteurs cette semaine, taux de presence aux cultes, nombre de requetes de priere en attente, departements qui manquent de serviteurs. Quatriemement, le panneau de validation des demandes de role affiche la file d'attente des demandes member/servant/chief avec la possibilite d'approuver ou de refuser en un clic."));

  content.push(h2("6.2 Tableau de Bord du Chef de Departement"));
  content.push(body("Le chef de departement dispose d'un tableau de bord oriente gestion operationnelle. Le premier widget est le tableau des communiques : un editeur de texte simple pour rediger des annonces officielles (ex: \"Repetition generale ce samedi a 14h\"). Seuls les serviteurs de son departement recoivent la notification et peuvent commenter, creant un espace de communication prive et efficace. Le deuxieme widget est le planning des services avec rotations : un calendrier interactif ou le chef attribue les roles pour chaque service (culte du dimanche, veillee, etc.). Par exemple, le chef de la louange assigne Jean a la guitare et Marc au son pour le culte du 20 juillet. Les serviteurs recoivent une notification et peuvent accepter ou refuser directement depuis leur propre tableau de bord."));

  content.push(h2("6.3 Espace Communautaire (Serviteurs et Membres)"));
  content.push(body("L'espace des serviteurs et membres est concu comme un reseau social interne epure, inspire de groupes Facebook prives mais sans les elements de distraction. Le fil d'actualite du departement affiche les publications de l'equipe : besoins techniques, sujets de priere, encouragements. Chaque membre peut commenter les publications, creant une dynamique communautaire. Le deuxieme element est le calendrier personnel de service : le serviteur voit ses prochaines dates de passage, ses assignments acceptees et en attente, et peut signaler une indisponibilite. Le troisieme element est l'espace de priere : soumettre une demande, voir les demandes de l'equipe, et suivre le statut de ses propres requetes."));

  // ─── SECTION 7: Decisions a Trancher ──────────────────────
  content.push(h1("7. Decisions a Trancher Maintenant vs Différer"));
  content.push(body("Tout projet logiciel implique une serie de decisions, certaines urgentes et d'autres qui peuvent attendre. L'erreur la plus courante dans les projets d'eglise est de vouloir tout prevoir des le depart, ce qui retarde le lancement et complexifie le code inutilement. Cette section categorise chaque decision en fonction de son urgence et de son impact, en suivant le principe YAGNI (You Aren't Gonna Need It) : ne construire que ce qui est necessaire pour le MVP, et différer le reste."));

  content.push(h2("7.1 Decisions Immediates (avant la premiere mise en production)"));

  content.push(buildTable(
    ["Decision", "Options", "Recommandation", "Raison"],
    [
      ["ENUM vs Table roles", "ENUM / Table / Hybrid", "Garder ENUM", "6 roles fixes couvrent le MVP, migrer si besoin"],
      ["Multi-departement", "Oui / Non / Limite a 2", "Oui (deja implmente)", "La table department_members le permet deja"],
      ["Inscription publique", "Ouverte / Sur invitation", "Ouverte avec delai", "Formulaire accessible, role visitor par defaut"],
      ["Transition visitor->member", "Auto / Manuelle / Hybride", "Automatique apres 3 jours", "Reduit la charge admin, filtre minimal"],
      ["Anonymat prières", "Oui / Non", "Oui (deja implemente)", "Champs is_anonymous et is_confidential existent"],
      ["Notifications in-app", "Oui / Non / Plus tard", "Oui (table a creer)", "Essentiel pour le feedback \"j'ai prie\""],
    ],
    [20, 22, 28, 30],
  ));
  content.push(caption("Tableau 3 — Decisions a trancher avant la mise en production"));

  content.push(h2("7.2 Decisions Differables (Post-MVP)"));
  content.push(body("Plusieurs fonctionnalites avancees peuvent attendre les premiers retours utilisateurs avant d'etre implementees. Le systeme de presence (attendance tracking) necessite une reflexion sur le format : scan QR, liste papier numerisee, ou declaration d'honneur ? La croissance spirituelle (growth_milestones) depend de la theologie specifique de l'eglise : quels jalons sont pertinents ? Le systeme de dons et dimes est un sujet sensible qui necessite une conformite reglementaire. L'application mobile native (PWA ou React Native) depend de l'adoption du web app. Le streaming video integre necessite une infrastructure de CDN qui a un cout recurrent. Chacune de ces fonctionnalites merite sa propre etude de faisabilite, mais aucune ne bloque le lancement du MVP."));

  content.push(h2("7.3 Zones de Risque (Se Peindre dans un Coin)"));
  content.push(body("Plusieurs decisions architecturales pourraient devenir des pieges si elles ne sont pas anticipées. Premier risque : le role global unique. Si un serviteur du departement Louange devient chef du departement Medias, son role global passe a 'chief', mais il perd l'acces specifique au niveau 'servant' de la louange. Ce n'est pas un probleme aujourd'hui car les policies RLS verifient is_chief_or_above() qui inclut chief, mais cela pourrait le devenir si des fonctionnalites specifiques aux servants sont ajoutees. La solution preptive est de toujours verifier le role PLUS l'appartenance departementale plutot que le role seul."));
  content.push(body("Deuxieme risque : la suppression de role. Si un chef demissionne, faut-il le retrograder a 'servant' ou a 'member' ? Qui decide ? Le schema actuel ne prevoit pas de champ role_history. Nous recommandons d'ajouter un champ previous_role (text nullable) pour tracer les changements de role sans complexifier le schema. Troisieme risque : la confidentialite croisee. Un chef qui est aussi membre d'un autre departement pourrait theoriquement voir les publications privees de ce departement via belongs_to_dept(). C'est un comportement intentionnel (polyvalence) mais il faut s'assurer que les utilisateurs le comprennent."));

  // ─── SECTION 8: Schema SQL Complementaire ─────────────────
  content.push(h1("8. Schema SQL Complementaire"));
  content.push(body("Cette section presente les schemas SQL pour les tables complementaires identifiees dans la section 3.4. Ces schemas sont prets a etre integres dans une nouvelle migration et incluent les politiques RLS appropriees. Ils sont concus pour s'integrer harmonieusement avec le schema existant sans casser les migrations precedentes."));

  content.push(h2("8.1 Table notifications"));
  content.push(body("La table des notifications in-app est essentielle pour le feedback pastoral (\"Le pasteur a prie pour votre requete\"), les assignations de service (\"Vous etes assigne a la guitare ce dimanche\"), et les validations de role (\"Votre demande de serviteur a ete approuvee\"). Son schema est simple mais complet."));

  content.push(sqlBlock(`CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id)
    ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'prayer_prayed', 'service_assigned', 'service_accepted',
    'service_declined', 'role_approved', 'role_rejected',
    'new_post', 'new_comment', 'daily_thought', 'general'
  )),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifs_user_unread
  ON notifications(user_id, is_read, created_at DESC);`));

  content.push(h2("8.2 Ameliorations user_profiles"));
  content.push(body("Deux champs complementaires sont recommandes pour enrichir le profil sans casser le schema existant. Le champ joined_via permet de tracer l'origine de chaque membre (important pour le suivi des visiteurs et l'indicateur de sante de l'eglise). Le champ membership_date distingue la date technique d'inscription de la date d'adoption officielle."));

  content.push(sqlBlock(`-- Ajout de champs complementaires
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS
  joined_via TEXT CHECK (joined_via IN (
    'word_of_mouth', 'social_media', 'event',
    'website', 'invitation', 'other'
  ));
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS
  membership_date DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS
  bio TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS
  previous_role TEXT;`));

  content.push(h2("8.3 Politiques RLS pour notifications"));
  content.push(body("Les notifications suivent un modele simple : un utilisateur ne voit que ses propres notifications. L'INSERT est reserve aux fonctions SYSTEM (via triggers ou RPC) pour empecher les utilisateurs de s'envoyer des fausses notifications. L'UPDATE est autorise uniquement pour marquer comme lue."));

  content.push(sqlBlock(`ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notif_select ON notifications FOR SELECT
  USING (owns_profile(user_id));
CREATE POLICY notif_update ON notifications FOR UPDATE
  USING (owns_profile(user_id));
-- INSERT via trigger ou RPC uniquement (pas de policy publique)`));

  // ─── SECTION 9: Plan d'Action ─────────────────────────────
  content.push(h1("9. Plan d'Action Concret"));
  content.push(body("Ce plan d'action organise les prochaines etapes en trois phases, de la plus critique a la plus avancée. Chaque phase a un objectif clair et des livrables mesurables. La phase 1 peut etre realisee en une semaine, la phase 2 en deux semaines, et la phase 3 en trois a quatre semaines selon la complexite des tableaux de bord."));

  content.push(h2("9.1 Phase 1 : Fondations (Semaine 1)"));
  content.push(body("L'objectif de cette phase est de stabiliser le schema de donnees et d'ouvrir l'inscription publique. Les livrables incluent : la migration SQL complementaire (table notifications, champs user_profiles), la creation d'un RPC pour les requetes de priere anonymes (pour permettre aux non-authentifies de soumettre), l'activation du formulaire d'inscription public avec le flux en 3 etapes (email/MDP, profil de base, interets), et la mise a jour du composant OnboardingFlow existant pour s'aligner avec le flux decrit dans la section 5.2."));

  content.push(h2("9.2 Phase 2 : Communaute (Semaines 2-3)"));
  content.push(body("L'objectif est de deployer les fonctionnalites communautaires. Les livrables incluent : le tableau de bord differencie par role (3 versions : pasteur, chef, membre/serviteur), le fil d'actualite des departements (publication + commentaires), le panneau de validation des demandes de role dans l'admin, le systeme de requetes de priere avec bouton \"J'ai prie\" et notification, et le generateur de Pensée du Jour pour le pasteur."));

  content.push(h2("9.3 Phase 3 : Operations (Semaines 4-6)"));
  content.push(body("L'objectif est d'ajouter la couche operationnelle. Les livrables incluent : le planning des services avec rotations et acceptation/refus, le suivi des visiteurs avec attribution automatique, l'indicateur de sante de l'eglise (metriques et graphiques), le systeme de notifications in-app complet, et l'optimisation des performances (index, requetes N+1, pagination)."));

  content.push(buildTable(
    ["Phase", "Duree", "Livrables Cles", "Risque Principal"],
    [
      ["Phase 1 : Fondations", "1 semaine", "Schema SQL, inscription publique, RPC anonyme", "Migration sur base de donnee en production"],
      ["Phase 2 : Communaute", "2 semaines", "Dashboards, fil actu, priere, validation roles", "UX des tableaux de bord"],
      ["Phase 3 : Operations", "3 semaines", "Planning services, suivi visiteurs, notifs", "Complexite des rotations"],
    ],
    [18, 12, 40, 30],
  ));
  content.push(caption("Tableau 4 — Plan d'action en 3 phases"));

  return content;
}

// ═══════════════════════════════════════════════════════════════
//  ASSEMBLY
// ═══════════════════════════════════════════════════════════════
async function main() {
  const bodyContent = buildBody();

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: { ascii: "Liberation Serif" }, size: 22, color: "000000" },
          paragraph: { spacing: { line: 312 } },
        },
        heading1: {
          run: { font: { ascii: "Liberation Sans" }, size: 32, bold: true, color: c(P.body) },
          paragraph: { spacing: { before: 480, after: 200 } },
        },
        heading2: {
          run: { font: { ascii: "Liberation Sans" }, size: 28, bold: true, color: c(P.body) },
          paragraph: { spacing: { before: 360, after: 160 } },
        },
        heading3: {
          run: { font: { ascii: "Liberation Sans" }, size: 24, bold: true, color: c(P.secondary) },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
      },
    },
    sections: [
      // Section 1: Cover (no page number)
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
          },
        },
        children: buildCover(),
      },
      // Section 2: TOC (Roman numerals)
      buildTocSection(),
      // Section 3: Body (Arabic, starts at 1)
      {
        properties: {
          type: SectionType.NEXT_PAGE,
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
          },
        },
        headers: {
          default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Architecture Technique — Church ERP La Conquete", size: 16, color: c(P.secondary), font: { ascii: "Liberation Sans" }, italics: true })] })] }),
        },
        footers: {
          default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "PAGE  \\* arabic  \\* MERGEFORMAT", size: 16, color: c(P.secondary), font: { ascii: "Liberation Sans" } })] })] }),
        },
        children: bodyContent,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("/home/z/my-project/download/Architecture_Technique_Church_ERP_La_Conquete.docx", buffer);
  console.log("Document generated successfully!");
}

main().catch(console.error);