const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, PageNumber, PageBreak,
  SectionType, TableOfContents, WidthType, ShadingType, BorderStyle,
  NumberFormat, TabStopType, TabStopPosition
} = require("docx");

// ─── Color Palette ───────────────────────────────────────────────
const P = {
  primary: "1a1510",
  body: "2c2520",
  secondary: "6b5d4f",
  accent: "c49a2a",
  surface: "faf6ee",
  cover: {
    bg: "1a1510",
    titleColor: "FFFFFF",
    subtitleColor: "d4b96a",
    metaColor: "b8a47a",
    accentBar: "c49a2a",
    footerColor: "8a7a5a",
  },
};

const BLACK = "000000";
const LINE_SPACING = 312;
const INDENT_FIRST = 480;
const FONT_BODY = "Times New Roman";
const FONT_HEADING = "SimHei";

// ─── No Borders ──────────────────────────────────────────────────
const allNoBorders = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
};

const thinBorder = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "d0c8b8" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "d0c8b8" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "d0c8b8" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "d0c8b8" },
};

const tableHeaderBorders = {
  top: { style: BorderStyle.SINGLE, size: 2, color: P.accent },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: P.accent },
  left: { style: BorderStyle.SINGLE, size: 1, color: "d0c8b8" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "d0c8b8" },
};

// ─── Helpers ─────────────────────────────────────────────────────
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200, line: LINE_SPACING },
    children: [
      new TextRun({
        text: text,
        font: FONT_HEADING,
        size: 32,
        bold: true,
        color: BLACK,
      }),
    ],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 160, line: LINE_SPACING },
    children: [
      new TextRun({
        text: text,
        font: FONT_HEADING,
        size: 30,
        bold: true,
        color: BLACK,
      }),
    ],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120, line: LINE_SPACING },
    children: [
      new TextRun({
        text: text,
        font: FONT_HEADING,
        size: 28,
        bold: true,
        color: BLACK,
      }),
    ],
  });
}

function body(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 100, line: LINE_SPACING },
    indent: { firstLine: INDENT_FIRST },
    children: [
      new TextRun({
        text: text,
        font: FONT_BODY,
        size: 24,
        color: P.body,
      }),
    ],
  });
}

function bodyNoIndent(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 100, line: LINE_SPACING },
    children: [
      new TextRun({
        text: text,
        font: FONT_BODY,
        size: 24,
        color: P.body,
      }),
    ],
  });
}

function bulletItem(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 60, line: LINE_SPACING },
    indent: { left: 480, hanging: 240 },
    children: [
      new TextRun({ text: "\u2022  ", font: FONT_BODY, size: 24, color: P.body }),
      new TextRun({ text: text, font: FONT_BODY, size: 24, color: P.body }),
    ],
  });
}

function emptyPara(spacing) {
  return new Paragraph({
    spacing: { after: spacing || 0, line: LINE_SPACING },
    children: [new TextRun({ text: "", font: FONT_BODY, size: 24 })],
  });
}

function tableCell(text, opts = {}) {
  const { bold, header, width, alignment, color, font: cellFont, span } = Object.assign(
    { bold: false, header: false, width: 20, alignment: AlignmentType.LEFT, color: P.body, font: FONT_BODY, span: 1 },
    opts
  );
  const shading = header
    ? { type: ShadingType.CLEAR, fill: "f0ead8", color: "auto" }
    : { type: ShadingType.CLEAR, fill: "FFFFFF", color: "auto" };
  return new TableCell({
    columnSpan: span || 1,
    width: { size: width, type: WidthType.PERCENTAGE },
    borders: header ? tableHeaderBorders : thinBorder,
    shading: shading,
    children: [
      new Paragraph({
        alignment: alignment,
        spacing: { before: 40, after: 40, line: LINE_SPACING },
        children: [
          new TextRun({
            text: text || "",
            font: cellFont,
            size: header ? 21 : 21,
            bold: bold || header,
            color: header ? P.primary : color,
          }),
        ],
      }),
    ],
  });
}

function makeTable(headers, rows, widths) {
  const totalWidth = widths || headers.map(() => Math.floor(100 / headers.length));
  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((h, i) =>
      tableCell(h, { header: true, width: totalWidth[i], bold: true, alignment: AlignmentType.CENTER })
    ),
  });
  const dataRows = rows.map(
    (row) =>
      new TableRow({
        cantSplit: true,
        children: row.map((cell, i) => {
          if (typeof cell === "object" && cell.text !== undefined) {
            return tableCell(cell.text, { width: totalWidth[i], alignment: cell.align || AlignmentType.LEFT, bold: cell.bold || false, font: cell.font || FONT_BODY, span: cell.span || 1 });
          }
          return tableCell(cell, { width: totalWidth[i] });
        }),
      })
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

function codeBlock(text) {
  const lines = text.split("\n");
  return lines.map(
    (line) =>
      new Paragraph({
        spacing: { after: 0, line: 260 },
        indent: { left: 360 },
        shading: { type: ShadingType.CLEAR, fill: "f5f0e4", color: "auto" },
        children: [
          new TextRun({
            text: line || " ",
            font: "Courier New",
            size: 18,
            color: P.primary,
          }),
        ],
      })
  );
}

// ─── Cover Section ───────────────────────────────────────────────
function buildCover() {
  // Cover is a table with one cell, full A4, dark bg
  const coverCell = new TableCell({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: allNoBorders,
    shading: { type: ShadingType.CLEAR, fill: P.cover.bg, color: "auto" },
    verticalAlign: "center",
    children: [
      // Top accent bar
      new Paragraph({
        spacing: { before: 0, after: 600, line: LINE_SPACING },
        children: [new TextRun({ text: "", font: FONT_BODY, size: 24 })],
      }),
      // Gold accent line using border
      new Paragraph({
        spacing: { before: 0, after: 400, line: LINE_SPACING },
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: P.cover.accentBar, space: 1 } },
        children: [new TextRun({ text: "", font: FONT_BODY, size: 24, color: P.cover.titleColor })],
      }),
      // Main title
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 400, after: 200, line: 400 },
        indent: { left: 600 },
        children: [
          new TextRun({
            text: "Sp\u00e9cification Fonctionnelle",
            font: FONT_HEADING,
            size: 52,
            bold: true,
            color: P.cover.titleColor,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 100, line: 380 },
        indent: { left: 600 },
        children: [
          new TextRun({
            text: "Plateforme Web",
            font: FONT_HEADING,
            size: 48,
            bold: true,
            color: P.cover.titleColor,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 100, after: 300, line: 360 },
        indent: { left: 600 },
        children: [
          new TextRun({
            text: "\u00c9glise \u00c9vang\u00e9lique La Conqu\u00eate",
            font: FONT_HEADING,
            size: 44,
            bold: true,
            color: P.cover.subtitleColor,
          }),
        ],
      }),
      // Gold accent line
      new Paragraph({
        spacing: { before: 100, after: 400, line: LINE_SPACING },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: P.cover.accentBar, space: 1 } },
        indent: { left: 600, right: 600 },
        children: [new TextRun({ text: "", font: FONT_BODY, size: 24, color: P.cover.titleColor })],
      }),
      // Subtitle
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 200, after: 100, line: 340 },
        indent: { left: 600 },
        children: [
          new TextRun({
            text: "Enrichissement num\u00e9rique : Onboarding, Espace Membre, PWA, Streaming,",
            font: FONT_BODY,
            size: 24,
            color: P.cover.subtitleColor,
            italics: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 400, line: 340 },
        indent: { left: 600 },
        children: [
          new TextRun({
            text: "Groupes de Maison et Suivi Spirituel",
            font: FONT_BODY,
            size: 24,
            color: P.cover.subtitleColor,
            italics: true,
          }),
        ],
      }),
      // Meta
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 600, after: 100, line: LINE_SPACING },
        indent: { left: 600 },
        children: [
          new TextRun({
            text: "Version 1.0 \u2014 Juillet 2026",
            font: FONT_BODY,
            size: 22,
            color: P.cover.metaColor,
          }),
        ],
      }),
      // Footer area
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 1800, after: 0, line: LINE_SPACING },
        indent: { left: 600 },
        children: [
          new TextRun({
            text: "Document confidentiel \u2014 Usage interne",
            font: FONT_BODY,
            size: 18,
            color: P.cover.footerColor,
            italics: true,
          }),
        ],
      }),
    ],
  });

  const coverTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        height: { value: 16838, rule: "exact" },
        children: [coverCell],
      }),
    ],
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 },
    },
  });

  return {
    properties: {
      page: {
        size: { width: 11906, height: 16838, orientation: "portrait" },
        margin: { top: 0, bottom: 0, left: 0, right: 0 },
      },
    },
    children: [coverTable],
  };
}

// ─── TOC Section ─────────────────────────────────────────────────
function buildTOC() {
  return {
    properties: {
      page: {
        size: { width: 11906, height: 16838, orientation: "portrait" },
        margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
      },
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: "Sp\u00e9cification Fonctionnelle \u2014 La Conqu\u00eate",
                font: FONT_BODY,
                size: 18,
                color: "808080",
                italics: true,
              }),
            ],
          }),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "PAGE  * ROMAN  * MERGEFORMAT", font: FONT_BODY, size: 18, color: "808080" }),
            ],
          }),
        ],
      }),
    },
    children: [
      new Paragraph({
        spacing: { before: 400, after: 400, line: LINE_SPACING },
        children: [
          new TextRun({
            text: "Table des mati\u00e8res",
            font: FONT_HEADING,
            size: 32,
            bold: true,
            color: BLACK,
          }),
        ],
      }),
      new TableOfContents("Table des mati\u00e8res", {
        hyperlink: true,
        headingStyleRange: "1-3",
      }),
      new Paragraph({
        children: [new PageBreak()],
      }),
    ],
  };
}

// ─── Body Section ────────────────────────────────────────────────
function buildBody() {
  const children = [];

  // ══════════════════════════════════════════════════════════════
  // 1. RÉSUMÉ EXÉCUTIF
  // ══════════════════════════════════════════════════════════════
  children.push(h1("1. R\u00e9sum\u00e9 Ex\u00e9cutif"));

  children.push(body(
    "Le pr\u00e9sent document constitue la sp\u00e9cification fonctionnelle compl\u00e8te de la plateforme web d\u00e9di\u00e9e \u00e0 l\u2019\u00c9glise \u00c9vang\u00e9lique La Conqu\u00eate. Il d\u00e9crit six fonctionnalit\u00e9s majeures con\u00e7ues pour transformer l\u2019exp\u00e9rience num\u00e9rique de la communaut\u00e9 eccl\u00e9siale, en renfor\u00e7ant l\u2019engagement des fid\u00e8les, en facilitant l\u2019acc\u00e8s aux ressources spirituelles et en cr\u00e9ant des ponts concrets entre la vie de l\u2019\u00e9glise locale et le monde num\u00e9rique contemporain."
  ));

  children.push(body(
    "La premi\u00e8re fonctionnalit\u00e9, le Parcours d\u2019Inscription Innovant, propose un tunnel d\u2019onboarding interactif en quatre \u00e0 cinq \u00e9tapes qui accueille chaque nouveau visiteur de mani\u00e8re personnalis\u00e9e. Ce parcours, adaptatif selon les r\u00e9ponses de l\u2019utilisateur, permet d\u2019orienter imm\u00e9diatement les personnes vers les ressources ou les pasteurs les plus pertinents pour leur situation spirituelle."
  ));

  children.push(body(
    "La deuxi\u00e8me fonctionnalit\u00e9, l\u2019Espace Utilisateur \u00c9ditable, offre \u00e0 chaque membre un profil complet et personnalisable, int\u00e9grant un syst\u00e8me de demande de pri\u00e8re avec gestion de la confidentialit\u00e9, des pr\u00e9f\u00e9rences de contact pastoral d\u00e9taill\u00e9es et un historique interactif des demandes. La troisi\u00e8me fonctionnalit\u00e9 transforme le site en Progressive Web App, garantissant l\u2019accessibilit\u00e9 hors ligne et les notifications push pour les rappels de cultes et les r\u00e9ponses aux pri\u00e8res."
  ));

  children.push(body(
    "Le Lecteur de Streaming Int\u00e9gr\u00e9, quatri\u00e8me fonctionnalit\u00e9, permet la diffusion en direct des cultes avec un chat en temps r\u00e9el mod\u00e9r\u00e9, un bouton de don flottant et un syst\u00e8me de replay avec marqueurs de chapitres. L\u2019Agenda Interactif des Groupes de Maison, cinqui\u00e8me fonctionnalit\u00e9, combine carte g\u00e9ographique interactive et liste filtrable pour faciliter l\u2019int\u00e9gration dans les groupes de proximit\u00e9. Enfin, le Suivi de Croissance Spirituelle propose un verset quotidien, un plan de lecture avec progression visuelle et un espace de partage de t\u00e9moignages."
  ));

  children.push(body(
    "Sur le plan strat\u00e9gique, cette sp\u00e9cification recommande une approche en trois phases : un MVP centr\u00e9 sur l\u2019onboarding et le profil membre, une V2 enrichissant la plateforme avec le streaming et les groupes de maison, puis une V3 int\u00e9grant la croissance spirituelle avanc\u00e9e et les fonctionnalit\u00e9s innovantes. L\u2019ensemble est con\u00e7u pour \u00eatre mobile-first, accessible et conforme aux exigences de confidentialit\u00e9 des donn\u00e9es personnelles. La pile technique recommand\u00e9e repose sur Next.js, Supabase et un h\u00e9bergement Cloudflare pour une performance optimale."
  ));

  // ══════════════════════════════════════════════════════════════
  // 2. FEATURE 1: ONBOARDING
  // ══════════════════════════════════════════════════════════════
  children.push(h1("2. Parcours d\u2019Inscription Innovant (Onboarding Interactif)"));

  children.push(h2("2.1 Description fonctionnelle d\u00e9taill\u00e9e"));
  children.push(body(
    "Le parcours d\u2019inscription innovant constitue le premier point de contact num\u00e9rique entre un visiteur et la communaut\u00e9 de l\u2019\u00c9glise \u00c9vang\u00e9lique La Conqu\u00eate. Contrairement \u00e0 un formulaire d\u2019inscription classique, ce syst\u00e8me d\u00e9ploie un tunnel d\u2019accueil en quatre \u00e0 cinq \u00e9tapes visuelles, con\u00e7u pour cr\u00e9er une exp\u00e9rience immersive et chaleureuse d\u00e8s les premi\u00e8res secondes de navigation."
  ));
  children.push(body(
    "Chaque \u00e9tape du tunnel est anim\u00e9e avec des transitions fluides, utilisant des illustrations spirituelles et des messages d\u2019accueil personnalis\u00e9s incluant le pr\u00e9nom de l\u2019utilisateur d\u00e8s sa saisie. Les questions pos\u00e9es sont sp\u00e9cifiquement adapt\u00e9es au contexte eccl\u00e9sial : statut spirituel actuel, centres d\u2019int\u00e9r\u00eat au sein de la vie d\u2019\u00e9glise, besoins pastoraux identifi\u00e9s et pr\u00e9f\u00e9rences de participation. Ce n\u2019est pas un simple questionnaire mais un v\u00e9ritable outil de discernement qui oriente le visiteur de mani\u00e8re personnalis\u00e9e."
  ));
  children.push(body(
    "Le syst\u00e8me d\u2019adaptation du parcours analyse les r\u00e9ponses en temps r\u00e9el pour modifier les \u00e9crans suivants. Par exemple, un visiteur qui indique \u00ab je d\u00e9couvre la foi \u00bb recevra des \u00e9crans diff\u00e9rents de celui qui se d\u00e9clare \u00ab membre actif \u00bb. Cette logique conditionnelle garantit que chaque utilisateur re\u00e7oit un parcours pertinent et non g\u00e9n\u00e9rique, augmentant significativement le taux de compl\u00e9tion de l\u2019inscription et l\u2019engagement initial."
  ));

  children.push(h2("2.2 Parcours utilisateur (UX Flow)"));
  children.push(body(
    "Le parcours utilisateur se d\u00e9compose en six \u00e9crans s\u00e9quentiels, chacun con\u00e7u pour r\u00e9colter une information sp\u00e9cifique tout en maintenant l\u2019engagement de l\u2019utilisateur gr\u00e2ce \u00e0 des micro-interactions soign\u00e9es."
  ));
  children.push(bodyNoIndent("\u00c9cran 1 \u2014 Splash Screen avec animation : Un \u00e9cran d\u2019accueil immersif affiche le logo de La Conqu\u00eate avec une animation lumineuse douce. Un message d\u2019accueil g\u00e9n\u00e9ral s\u2019affiche progressivement, accompagn\u00e9 d\u2019une invitation \u00e0 d\u00e9couvrir la communaut\u00e9. La dur\u00e9e d\u2019affichage est de trois secondes avec possibilit\u00e9 de passer directement."));
  children.push(bodyNoIndent("\u00c9cran 2 \u2014 Pr\u00e9nom et avatar : L\u2019utilisateur saisit son pr\u00e9nom, qui est imm\u00e9diatement utilis\u00e9 pour personnaliser les messages suivants. Un s\u00e9lecteur d\u2019avatar stylis\u00e9 permet de choisir une illustration repr\u00e9sentative. La transition vers l\u2019\u00e9cran suivant inclut une animation de bienvenue utilisant le pr\u00e9nom saisi."));
  children.push(bodyNoIndent("\u00c9cran 3 \u2014 Statut spirituel : Une s\u00e9lection visuelle de quatre options (Premi\u00e8re visite, Visiteur r\u00e9gulier, Membre actif, Responsable de minist\u00e8re) permet de classifier le profil. Chaque option est repr\u00e9sent\u00e9e par une ic\u00f4ne et une courte description, facilitant le choix intuitif."));
  children.push(bodyNoIndent("\u00c9cran 4 \u2014 Foi personnelle : Selon le statut s\u00e9lectionn\u00e9, des questions adapt\u00e9es sont pos\u00e9es. Pour un premier visiteur, la question porte sur son int\u00e9r\u00eat pour la foi. Pour un membre, elle explore ses besoins spirituels actuels. Les r\u00e9ponses sont volontairement ouvertes pour respecter la diversit\u00e9 des parcours de foi."));
  children.push(bodyNoIndent("\u00c9cran 5 \u2014 Centres d\u2019int\u00e9r\u00eat : Une grille visuelle de huit \u00e0 dix th\u00e9matiques (Louange, \u00c9tude biblique, Jeunesse, Enfants, Aide sociale, Groupes de maison, \u00c9v\u00e9nements, M\u00e9dias) permet \u00e0 l\u2019utilisateur de s\u00e9lectionner ses domaines d\u2019int\u00e9r\u00eat. La s\u00e9lection multiple est possible, chaque item s\u2019illuminant au survol avec une animation douce."));
  children.push(bodyNoIndent("\u00c9cran 6 \u2014 R\u00e9sum\u00e9 et redirection : Un r\u00e9capitulatif visuel des choix de l\u2019utilisateur est affich\u00e9 avec un message de bienvenue final personnalis\u00e9. Selon le profil d\u00e9tect\u00e9, des boutons d\u2019action cibl\u00e9s sont propos\u00e9s : rejoindre un groupe de maison, contacter un pasteur, explorer le plan de lecture biblique, ou simplement acc\u00e9der au tableau de bord."));

  children.push(h2("2.3 Structure des donn\u00e9es"));
  children.push(body(
    "Les donn\u00e9es collect\u00e9es lors du parcours d\u2019onboarding sont stock\u00e9es dans une table d\u00e9di\u00e9e, li\u00e9e au profil utilisateur. La structure ci-dessous d\u00e9taille chaque champ et ses contraintes."
  ));
  children.push(
    makeTable(
      ["Champ", "Type", "Contraintes", "Description", "Valeurs possibles"],
      [
        ["id", "UUID", "PK, auto-g\u00e9n\u00e9r\u00e9", "Identifiant unique de la r\u00e9ponse", "\u2014"],
        ["user_id", "UUID", "FK \u2192 users, NOT NULL", "R\u00e9f\u00e9rence au compte utilisateur", "\u2014"],
        ["step", "INTEGER", "NOT NULL, 1-6", "Num\u00e9ro de l\u2019\u00e9tape du tunnel", "1, 2, 3, 4, 5, 6"],
        ["question_key", "VARCHAR(100)", "NOT NULL", "Cl\u00e9 identifiant la question pos\u00e9e", "status, faith, interests..."],
        ["response_value", "TEXT", "NULLABLE", "Valeur de la r\u00e9ponse utilisateur", "Variable selon question"],
        ["created_at", "TIMESTAMP", "NOT NULL, default now()", "Date et heure de la r\u00e9ponse", "\u2014"],
      ],
      [18, 14, 22, 26, 20]
    )
  );

  children.push(h2("2.4 Logique m\u00e9tier"));
  children.push(body(
    "La logique m\u00e9tier du parcours d\u2019onboarding repose sur un syst\u00e8me de r\u00e8gles conditionnelles qui adaptent l\u2019exp\u00e9rience en temps r\u00e9el. Chaque r\u00e9ponse d\u00e9clenche des actions sp\u00e9cifiques visant \u00e0 int\u00e9grer le visiteur de mani\u00e8re pertinente dans la vie de l\u2019\u00e9glise."
  ));
  children.push(body(
    "Lorsqu\u2019un utilisateur s\u00e9lectionne \u00ab Je souhaite en savoir plus \u00bb dans la section relative \u00e0 la foi personnelle, le syst\u00e8me g\u00e9n\u00e8re automatiquement une notification adress\u00e9e \u00e0 l\u2019\u00e9quipe pastorale, incluant le pr\u00e9nom et les coordonn\u00e9es du visiteur. Cette notification est envoy\u00e9e via l\u2019application interne et par courriel dans un d\u00e9lai de cinq minutes, permettant une prise de contact rapide et personnalis\u00e9e."
  ));
  children.push(body(
    "Les d\u00e9clencheurs de notifications sont d\u00e9finis comme suit : toute premi\u00e8re visite g\u00e9n\u00e8re une alerte d\u2019accueil ; une expression de besoin spirituel d\u00e9clenche une notification pastorale prioritaire ; la s\u00e9lection de centres d\u2019int\u00e9r\u00eat sp\u00e9cifiques (jeunesse, aide sociale) cr\u00e9e des alertes cat\u00e9gorielles pour les responsables de minist\u00e8re concern\u00e9s."
  ));
  children.push(body(
    "Les r\u00e8gles de confidentialit\u00e9 imposent que les donn\u00e9es spirituelles (foi personnelle, besoins identifi\u00e9s) soient trait\u00e9es comme des informations sensibles. Elles ne sont accessibles qu\u2019aux seuls pasteurs d\u00e9sign\u00e9s et ne sont jamais partag\u00e9es avec les autres membres, m\u00eame au sein de l\u2019\u00e9quipe administrative. L\u2019utilisateur peut \u00e0 tout moment modifier ou supprimer ses r\u00e9ponses d\u2019onboarding depuis son espace personnel."
  ));

  children.push(h2("2.5 Recommandations techniques"));
  children.push(body(
    "Pour la r\u00e9alisation du parcours d\u2019onboarding, la biblioth\u00e8que Framer Motion est recommand\u00e9e pour les animations de transition entre les \u00e9crans. Cette solution offre des performances optimales sur mobile, des animations physiquement r\u00e9alistes et une API d\u00e9clarative parfaitement int\u00e9gr\u00e9e \u00e0 l\u2019\u00e9cosyst\u00e8me React. Les transitions de page doivent \u00eatre configur\u00e9es avec une dur\u00e9e de 300 \u00e0 500 millisecondes pour un \u00e9quilibre entre fluidit\u00e9 et r\u00e9activit\u00e9."
  ));
  children.push(body(
    "Le stockage des r\u00e9ponses utilise Supabase comme base de donn\u00e9es principale, avec la table onboarding_responses d\u00e9crite pr\u00e9c\u00e9demment. L\u2019architecture adopte une approche multi-\u00e9tape avec machine \u00e0 \u00e9tats (state machine) pour g\u00e9rer les transitions et la validation de chaque \u00e9tape. La biblioth\u00e8que XState est recommand\u00e9e pour impl\u00e9menter cette logique de mani\u00e8re robuste et testable."
  ));
  children.push(body(
    "Les performances sont optimis\u00e9es par le lazy loading des composants graphiques, la compression des illustrations au format WebP et la mise en cache des \u00e9tapes d\u00e9j\u00e0 compl\u00e9t\u00e9es en localStorage pour permettre une reprise en cas d\u2019interruption."
  ));

  children.push(h2("2.6 Consid\u00e9rations UX/Design"));
  children.push(body(
    "L\u2019approche design du parcours d\u2019onboarding est r\u00e9solument mobile-first, sachant que la majorit\u00e9 des visiteurs acc\u00e9deront au site depuis un smartphone. Le ton visuel est chaleureux et accueillant, utilisant une palette de couleurs domin\u00e9e par des tons dor\u00e9s et cr\u00e9meux qui \u00e9voquent la lumi\u00e8re et la chaleur communautaire. Les animations sont douces et non intrusives, con\u00e7ues pour guider sans distraire."
  ));
  children.push(body(
    "L\u2019accessibilit\u00e9 est un imp\u00e9ratif : chaque \u00e9cran respecte les crit\u00e8res WCAG 2.1 AA, avec des contrastes de couleur suffisants, des labels ARIA pour les \u00e9l\u00e9ments interactifs et une navigation compl\u00e8te au clavier. Les illustrations sont accompagn\u00e9es de textes alternatifs descriptifs, et les animations respectent la pr\u00e9f\u00e9rence syst\u00e8me \u00ab reduced motion \u00bb en se d\u00e9sactivant pour les utilisateurs sensibles aux mouvements."
  ));

  children.push(h2("2.7 Confidentialit\u00e9 et s\u00e9curit\u00e9"));
  children.push(body(
    "Les donn\u00e9es collect\u00e9es lors de l\u2019onboarding incluent des informations de nature spirituelle qui sont consid\u00e9r\u00e9es comme sensibles au sens du RGPD. Un consentement explicite et pr\u00e9alable est obligatoire avant toute collecte, avec une mention claire de l\u2019utilisation pr\u00e9vue des donn\u00e9es. Le bouton de consentement est distinct et ne peut \u00eatre activ\u00e9 par d\u00e9faut."
  ));
  children.push(body(
    "Les donn\u00e9es sont chiffr\u00e9es au repos (AES-256) et en transit (TLS 1.3). L\u2019acc\u00e8s aux r\u00e9ponses spirituelles est strictement limit\u00e9 par des Row Level Policies dans Supabase, permettant uniquement aux pasteurs d\u00e9sign\u00e9s de consulter ces informations. Chaque acc\u00e8s est trac\u00e9 dans un journal d\u2019audit, et l\u2019utilisateur dispose d\u2019un droit d\u2019acc\u00e8s, de rectification et de suppression exercable \u00e0 tout moment depuis son profil."
  ));

  // ══════════════════════════════════════════════════════════════
  // 3. FEATURE 2: ESPACE UTILISATEUR
  // ══════════════════════════════════════════════════════════════
  children.push(h1("3. Espace Utilisateur \u00c9ditable (Profil Membre)"));

  children.push(h2("3.1 Description fonctionnelle d\u00e9taill\u00e9e"));
  children.push(body(
    "L\u2019Espace Utilisateur \u00c9ditable constitue le tableau de bord personnel de chaque membre de la communaut\u00e9. Il s\u2019agit d\u2019un profil complet et enti\u00e8rement modifiable par l\u2019utilisateur, regroupant ses informations personnelles, ses pr\u00e9f\u00e9rences de communication, son syst\u00e8me de demande de pri\u00e8re et l\u2019historique de ses interactions avec la communaut\u00e9."
  ));
  children.push(body(
    "La section des informations personnelles permet la modification du pr\u00e9nom, nom, date de naissance, adresse, num\u00e9ro de t\u00e9l\u00e9phone et adresse \u00e9lectronique. Chaque champ est valid\u00e9 en temps r\u00e9el avec des messages d\u2019erreur clairs et contextualis\u00e9s. L\u2019utilisateur peut \u00e9galement uploader une photo de profil, avec un recadrage int\u00e9gr\u00e9 et une compression automatique pour optimiser les performances."
  ));
  children.push(body(
    "La fonctionnalit\u00e9 de demande de pri\u00e8re est un \u00e9l\u00e9ment central de cet espace. Chaque membre peut soumettre des demandes de pri\u00e8re en choisissant explicitement le niveau de confidentialit\u00e9 : confidentiel (visible uniquement par l\u2019\u00e9quipe pastorale) ou partag\u00e9 (visible par la communaut\u00e9 avec option d\u2019anonymat). Un historique complet des demandes est accessible, affichant le statut de chaque demande (en attente, pri\u00e9e, cl\u00f4tur\u00e9e) avec la date de prise en charge et les \u00e9ventuels messages d\u2019encouragement re\u00e7us."
  ));

  children.push(h2("3.2 Parcours utilisateur (UX Flow)"));
  children.push(body(
    "L\u2019utilisateur acc\u00e8de \u00e0 son espace via un menu principal ou en cliquant sur son avatar en haut \u00e0 droite de l\u2019interface. L\u2019espace est organis\u00e9 en quatre onglets principaux : Profil, Pri\u00e8res, Activit\u00e9 et Param\u00e8tres."
  ));
  children.push(bodyNoIndent("Onglet Profil : Affiche les informations personnelles actuelles dans un formulaire \u00e9ditable. Les modifications sont sauvegard\u00e9es automatiquement apr\u00e8s un d\u00e9lai de deux secondes sans modification (debounce), avec une indication visuelle de sauvegarde en cours et un message de confirmation une fois la sauvegarde effectu\u00e9e. Les pr\u00e9f\u00e9rences de contact pastoral (WhatsApp, SMS, Appel t\u00e9l\u00e9phonique) sont g\u00e9r\u00e9es via des interrupteurs toggle individuels, chacun pouvant \u00eatre activ\u00e9 ou d\u00e9sactiv\u00e9 ind\u00e9pendamment."));
  children.push(bodyNoIndent("Onglet Pri\u00e8res : Pr\u00e9sente un formulaire de nouvelle demande en haut de page, suivi de la liste historique des demandes. Chaque entr\u00e9e affiche le texte de la demande, le niveau de confidentialit\u00e9, la date de soumission et le statut actuel. Un filtre permet de trier par statut ou par date. Les demandes en cours peuvent \u00eatre modifi\u00e9es ou cl\u00f4tur\u00e9es manuellement par l\u2019utilisateur."));
  children.push(bodyNoIndent("Onglet Activit\u00e9 : Affiche un r\u00e9sum\u00e9 des interactions r\u00e9centes, y compris les groupes de maison rejoints, les \u00e9v\u00e9nements auxquels l\u2019utilisateur a particip\u00e9, les chapitres bibliques lus et les t\u00e9moignages partag\u00e9s. Cette vue offre une perspective d\u2019ensemble de l\u2019engagement au sein de la communaut\u00e9."));
  children.push(bodyNoIndent("Onglet Param\u00e8tres : Permet de g\u00e9rer les notifications (push, email, SMS), la langue de l\u2019interface, le th\u00e8me visuel et les options de confidentialit\u00e9 globales, y compris la suppression du compte."));

  children.push(h2("3.3 Structure des donn\u00e9es"));
  children.push(body(
    "Le profil utilisateur \u00e9tend la table users de Supabase avec des champs sp\u00e9cifiques. La table prayer_requests g\u00e8re les demandes de pri\u00e8re."
  ));
  children.push(h3("Extensions de user_profiles"));
  children.push(
    makeTable(
      ["Champ", "Type", "Contraintes", "Description", "Valeurs possibles"],
      [
        ["user_id", "UUID", "PK \u2192 users", "R\u00e9f\u00e9rence utilisateur", "\u2014"],
        ["display_name", "VARCHAR(100)", "NOT NULL", "Nom d\u2019affichage", "Texte libre"],
        ["avatar_url", "TEXT", "NULLABLE", "URL de la photo de profil", "URL Supabase Storage"],
        ["phone", "VARCHAR(20)", "NULLABLE", "Num\u00e9ro de t\u00e9l\u00e9phone", "Format international"],
        ["contact_whatsapp", "BOOLEAN", "default false", "Accepte contact via WhatsApp", "true / false"],
        ["contact_sms", "BOOLEAN", "default false", "Accepte contact via SMS", "true / false"],
        ["contact_call", "BOOLEAN", "default false", "Accepte appel t\u00e9l\u00e9phonique", "true / false"],
        ["preferences", "JSONB", "default '{}'", "Pr\u00e9f\u00e9rences diverses", "Objet JSON"],
      ],
      [18, 14, 22, 26, 20]
    )
  );
  children.push(h3("Table prayer_requests"));
  children.push(
    makeTable(
      ["Champ", "Type", "Contraintes", "Description", "Valeurs possibles"],
      [
        ["id", "UUID", "PK, auto-g\u00e9n\u00e9r\u00e9", "Identifiant unique", "\u2014"],
        ["user_id", "UUID", "FK \u2192 users, NOT NULL", "Auteur de la demande", "\u2014"],
        ["content", "TEXT", "NOT NULL", "Contenu de la demande", "Texte libre"],
        ["is_confidential", "BOOLEAN", "NOT NULL, default true", "Confidentiel ou partag\u00e9", "true / false"],
        ["is_anonymous", "BOOLEAN", "default false", "Anonyme si partag\u00e9", "true / false"],
        ["status", "VARCHAR(20)", "NOT NULL, default 'pending'", "Statut de la demande", "pending, prayed, closed"],
        ["created_at", "TIMESTAMP", "NOT NULL, default now()", "Date de cr\u00e9ation", "\u2014"],
        ["updated_at", "TIMESTAMP", "NOT NULL, auto-update", "Derni\u00e8re mise \u00e0 jour", "\u2014"],
      ],
      [18, 14, 24, 24, 20]
    )
  );

  children.push(h2("3.4 Logique m\u00e9tier"));
  children.push(body(
    "Les r\u00e8gles m\u00e9tier du profil membre garantissent la coh\u00e9rence et la s\u00e9curit\u00e9 des donn\u00e9es. Lors de la soumission d\u2019une demande de pri\u00e8re confidentielle, le syst\u00e8me v\u00e9rifie automatiquement que l\u2019utilisateur est authentifi\u00e9 et que son compte est actif. La demande est inscrite en base avec le flag is_confidential \u00e0 true et n\u2019est jamais expos\u00e9e via les API publiques."
  ));
  children.push(body(
    "Pour les demandes partag\u00e9es, une mod\u00e9ration automatique filtre les contenus inappropri\u00e9s via une liste de mots-cl\u00e9s et une analyse de sentiment. Les demandes mod\u00e9r\u00e9es sont mises en attente de validation par un administrateur. Lorsqu\u2019un membre de l\u2019\u00e9quipe pastorale marque une demande comme \u00ab pri\u00e9e \u00bb, une notification est envoy\u00e9e \u00e0 l\u2019auteur de la demande pour l\u2019informer que sa requ\u00eate a \u00e9t\u00e9 prise en compte dans la pri\u00e8re."
  ));
  children.push(body(
    "Les pr\u00e9f\u00e9rences de contact pastoral sont respect\u00e9es de mani\u00e8re stricte : aucun message ne peut \u00eatre envoy\u00e9 via un canal d\u00e9sactiv\u00e9 par l\u2019utilisateur. Les modifications des pr\u00e9f\u00e9rences sont enregistr\u00e9es avec un horodatage dans le journal d\u2019audit, permettant de tracer l\u2019historique des consentements."
  ));

  children.push(h2("3.5 Recommandations techniques"));
  children.push(body(
    "L\u2019espace utilisateur doit \u00eatre impl\u00e9ment\u00e9 comme un ensemble de composants React modulaires, chacun responsable d\u2019un onglet sp\u00e9cifique. L\u2019\u00e9tat global du profil est g\u00e9r\u00e9 via React Query (TanStack Query) pour la synchronisation avec Supabase, offrant un cache intelligent et des revalidations automatiques. Les formulaires utilisent React Hook Form avec validation Zod pour une gestion robuste des saisies."
  ));
  children.push(body(
    "Les images de profil sont stock\u00e9es dans Supabase Storage avec des r\u00e8gles de s\u00e9curit\u00e9 restreignant l\u2019acc\u00e8s au propri\u00e9taire et aux administrateurs. La compression c\u00f4t\u00e9 client est r\u00e9alis\u00e9e avec la biblioth\u00e8que browser-image-compression avant l\u2019upload, limitant la taille des fichiers \u00e0 500 Ko."
  ));

  children.push(h2("3.6 Consid\u00e9rations UX/Design"));
  children.push(body(
    "L\u2019interface du profil membre adopte une approche minimaliste et chaleureuse, avec des cartes blanches arrondies sur fond cr\u00e9meux. Les champs de formulaire utilisent des labels flottants (floating labels) pour \u00e9conomiser l\u2019espace vertical sur mobile. Les toggle switches pour les pr\u00e9f\u00e9rences de contact utilisent un code couleur vert (activ\u00e9) et gris (d\u00e9sactiv\u00e9) pour une compr\u00e9hension imm\u00e9diate."
  ));
  children.push(body(
    "La section des demandes de pri\u00e8re utilise un syst\u00e8me de cartes avec des indicateurs visuels de statut : une ic\u00f4ne de sablier pour les demandes en attente, une main en pri\u00e8re pour les demandes prises en charge et un cocher vert pour les demandes cl\u00f4tur\u00e9es. Les transitions entre les onglets sont anim\u00e9es avec un effet de glissement horizontal subtil."
  ));

  children.push(h2("3.7 Confidentialit\u00e9 et s\u00e9curit\u00e9"));
  children.push(body(
    "Toutes les donn\u00e9es personnelles sont prot\u00e9g\u00e9es par l\u2019authentification Supabase avec des jetons JWT \u00e0 dur\u00e9e de vie limit\u00e9e. Les demandes de pri\u00e8re confidentielles sont chiffr\u00e9es en base avec pgcrypto, garantissant que m\u00eame un acc\u00e8s direct \u00e0 la base de donn\u00e9es ne r\u00e9v\u00e8le pas le contenu. Les administrateurs non pastoraux n\u2019ont jamais acc\u00e8s au contenu des demandes confidentielles."
  ));
  children.push(body(
    "Le droit \u00e0 l\u2019oubli est impl\u00e9ment\u00e9 via une fonction de suppression en cascade : la suppression d\u2019un compte entra\u00eene la suppression de toutes les donn\u00e9es associ\u00e9es (profil, pri\u00e8res, historique) dans un d\u00e9lai de 30 jours, avec une p\u00e9riode de r\u00e9tractation pendant laquelle les donn\u00e9es sont simplement anonymis\u00e9es."
  ));

  // ══════════════════════════════════════════════════════════════
  // 4. FEATURE 3: PWA
  // ══════════════════════════════════════════════════════════════
  children.push(h1("4. PWA (Progressive Web App)"));

  children.push(h2("4.1 Description fonctionnelle d\u00e9taill\u00e9e"));
  children.push(body(
    "La transformation du site en Progressive Web App permet aux membres de la communaut\u00e9 d\u2019acc\u00e9der \u00e0 la plateforme comme s\u2019il s\u2019agissait d\u2019une application native, sans n\u00e9cessiter de t\u00e9l\u00e9chargement depuis un store. L\u2019installation se fait en un clic depuis le navigateur, cr\u00e9ant un raccourci sur l\u2019\u00e9cran d\u2019accueil du t\u00e9l\u00e9phone avec l\u2019ic\u00f4ne et le nom de l\u2019\u00e9glise."
  ));
  children.push(body(
    "La PWA garantit un fonctionnement hors ligne des fonctionnalit\u00e9s essentielles : lecture des versets du jour en cache, consultation du plan de lecture biblique, acc\u00e8s aux demandes de pri\u00e8re d\u00e9j\u00e0 charg\u00e9es et visualisation des informations de contact des groupes de maison. Les notifications push permettent d\u2019envoyer des rappels avant les cultes, des alertes pour les \u00e9v\u00e9nements sp\u00e9ciaux et des notifications de r\u00e9ponse aux demandes de pri\u00e8re."
  ));

  children.push(h2("4.2 Parcours utilisateur (UX Flow)"));
  children.push(body(
    "Lors de la premi\u00e8re visite sur mobile, une banni\u00e8re d\u2019installation personnalis\u00e9e appara\u00eet apr\u00e8s deux pages visit\u00e9es, invitant l\u2019utilisateur \u00e0 ajouter La Conqu\u00eate \u00e0 son \u00e9cran d\u2019accueil. Cette banni\u00e8re est discr\u00e8te mais visible, avec un message chaleureux et un bouton d\u2019action clair."
  ));
  children.push(bodyNoIndent("Exp\u00e9rience en ligne : L\u2019utilisateur b\u00e9n\u00e9ficie de l\u2019int\u00e9gralit\u00e9 des fonctionnalit\u00e9s avec des performances optimales. Les donn\u00e9es sont synchronis\u00e9es en temps r\u00e9el avec le serveur, et les notifications push sont re\u00e7ues instantan\u00e9ment."));
  children.push(bodyNoIndent("Exp\u00e9rience hors ligne : Un indicateur visuel en haut de page signale le mode hors ligne. Les donn\u00e9es en cache sont accessibles en lecture seule. Les actions n\u00e9cessitant une connexion (soumission de pri\u00e8re, inscription \u00e0 un groupe) sont mises en file d\u2019attente et synchronis\u00e9es automatiquement d\u00e8s le retour de la connexion."));
  children.push(bodyNoIndent("Notifications push : L\u2019utilisateur est invit\u00e9 \u00e0 autoriser les notifications lors de la premi\u00e8re connexion. Les cat\u00e9gories de notifications sont configurables : rappels de culte (24h et 1h avant), r\u00e9ponses aux pri\u00e8res, annonces de la communaut\u00e9 et rappels du plan de lecture quotidien."));

  children.push(h2("4.3 Structure des donn\u00e9es"));
  children.push(body(
    "La structure technique de la PWA repose sur deux fichiers fondamentaux : le manifest.json et le service worker. Ces fichiers d\u00e9finissent l\u2019identit\u00e9 de l\u2019application et les r\u00e8gles de mise en cache."
  ));
  children.push(h3("Extrait de manifest.json"));
  children.push(...codeBlock(`{
  "name": "\u00c9glise La Conqu\u00eate",
  "short_name": "La Conqu\u00eate",
  "description": "Plateforme communautaire",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#faf6ee",
  "theme_color": "#1a1510",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}`));

  children.push(h2("4.4 Logique m\u00e9tier"));
  children.push(body(
    "La strat\u00e9gie de cache adopt\u00e9e est une approche hybride combinant Cache First pour les ressources statiques (images, polices, styles) et Network First pour les donn\u00e9es dynamiques (contenu utilisateur, notifications). Cette strat\u00e9gie garantit des temps de chargement rapides tout en assurant la fra\u00eecheur des donn\u00e9es utilisateur."
  ));
  children.push(body(
    "Les notifications push suivent un flux pr\u00e9cis : le serveur envoie un payload contenant le type de notification, le titre et le message via Firebase Cloud Messaging (FCM) ou l\u2019API Web Push standard. Le service worker re\u00e7oit la notification et l\u2019affiche avec les actions appropri\u00e9es (ouvrir le culte en direct, voir la pri\u00e8re r\u00e9pondue). Un planning de notifications automatique est g\u00e9r\u00e9 c\u00f4t\u00e9 serveur pour les rappels r\u00e9currents."
  ));

  children.push(h2("4.5 Recommandations techniques"));
  children.push(body(
    "L\u2019impl\u00e9mentation du service worker utilise Workbox de Google, qui fournit des abstractions de haut niveau pour les strat\u00e9gies de cache. L\u2019enregistrement du service worker se fait lors du chargement initial de la page, avec une mise \u00e0 jour silencieuse en arri\u00e8re-plan et un message invitant l\u2019utilisateur \u00e0 recharger pour obtenir la nouvelle version."
  ));
  children.push(h3("Strat\u00e9gie de Service Worker (extrait)"));
  children.push(...codeBlock(`// Cache-first pour les assets statiques
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 100 })]
  })
);

// Network-first pour les donn\u00e9es API
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-data',
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 50 })]
  })
);`));

  children.push(h2("4.6 Consid\u00e9rations UX/Design"));
  children.push(body(
    "La PWA doit offrir une exp\u00e9rience visuelle identique \u00e0 celle d\u2019une application native. L\u2019\u00e9cran de splash personnalis\u00e9 affiche le logo de La Conqu\u00eate et le th\u00e8me dor\u00e9 pendant le chargement. La barre de navigation inf\u00e9rieure est adapt\u00e9e au mode standalone, masquant la barre d\u2019adresse du navigateur pour un affichage plein \u00e9cran."
  ));
  children.push(body(
    "Le mode hors ligne est signal\u00e9 par une barre de statut subtile en haut de page, utilisant une couleur am\u00e8re pour diff\u00e9rencier de l\u2019\u00e9tat normal. Les \u00e9l\u00e9ments non disponibles hors ligne sont d\u00e9sactiv\u00e9s visuellement avec une opacit\u00e9 r\u00e9duite et une info-bulle expliquant que la connexion est requise."
  ));

  children.push(h2("4.7 Confidentialit\u00e9 et s\u00e9curit\u00e9"));
  children.push(body(
    "Les notifications push sont soumises au consentement explicite de l\u2019utilisateur. Le syst\u00e8me ne demande l\u2019autorisation qu\u2019au moment opportun, jamais au chargement initial de la page. L\u2019utilisateur peut r\u00e9voquer cette autorisation \u00e0 tout moment depuis les param\u00e8tres de son profil ou via les param\u00e8tres syst\u00e8me de son appareil."
  ));
  children.push(body(
    "Le cache du service worker ne stocke jamais de donn\u00e9es personnelles sensibles (mots de passe, demandes de pri\u00e8re confidentielles). Seules les donn\u00e9es publiques et les ressources statiques sont mises en cache. Les jetons d\u2019authentification sont exclus du cache et g\u00e9r\u00e9s exclusivement par le cycle de vie de l\u2019application."
  ));

  // ══════════════════════════════════════════════════════════════
  // 5. FEATURE 4: STREAMING
  // ══════════════════════════════════════════════════════════════
  children.push(h1("5. Lecteur de Streaming Int\u00e9gr\u00e9"));

  children.push(h2("5.1 Description fonctionnelle d\u00e9taill\u00e9e"));
  children.push(body(
    "Le Lecteur de Streaming Int\u00e9gr\u00e9 est la pi\u00e8ce ma\u00eetresse de l\u2019exp\u00e9rience num\u00e9rique des cultes de La Conqu\u00eate. Il permet la diffusion en direct (live streaming) des c\u00e9l\u00e9brations, conf\u00e9rences et \u00e9v\u00e9nements sp\u00e9ciaux directement depuis la plateforme, sans rediriger les utilisateurs vers des services tiers comme YouTube ou Facebook Live."
  ));
  children.push(body(
    "Le lecteur int\u00e8gre un chat en temps r\u00e9el mod\u00e9r\u00e9, permettant aux fid\u00e8les distants de communiquer entre eux et d\u2019envoyer des messages d\u2019encouragement pendant le culte. Un bouton de don flottant est visible pendant toute la dur\u00e9e du direct, facilitant les offrandes en ligne. Apr\u00e8s l\u2019\u00e9v\u00e9nement, le replay est automatiquement disponible avec des marqueurs de chapitres permettant de naviguer directement aux moments cl\u00e9s (louange, pr\u00e9dication, autel)."
  ));

  children.push(h2("5.2 Parcours utilisateur (UX Flow)"));
  children.push(bodyNoIndent("Acc\u00e8s au direct : Lorsqu\u2019un culte est en cours de diffusion, une banni\u00e8re anim\u00e9e avec un indicateur rouge \u00ab EN DIRECT \u00bb appara\u00eet en haut de la page d\u2019accueil. Un clic sur cette banni\u00e8re ou sur le lien \u00ab Regarder le culte \u00bb ouvre le lecteur plein \u00e9cran. Sur mobile, le lecteur prend toute la largeur avec le chat accessible par un onglet glissant."));
  children.push(bodyNoIndent("Exp\u00e9rience pendant le direct : Le lecteur occupe la partie sup\u00e9rieure de l\u2019\u00e9cran. En dessous, le chat en temps r\u00e9el affiche les messages avec les avatars et noms des participants. Le bouton de don flottant, positionn\u00e9 en bas \u00e0 droite, reste visible m\u00eame lors du d\u00e9filement. Un compteur de spectateurs en temps r\u00e9el est affich\u00e9 \u00e0 c\u00f4t\u00e9 de l\u2019indicateur \u00ab EN DIRECT \u00bb."));
  children.push(bodyNoIndent("Consultation des replays : La page des replays affiche une galerie vid\u00e9o avec miniatures, dates et titres. Chaque vid\u00e9o dispose de marqueurs de chapitres cliquables dans la barre de progression : Louange, Annonces, Pr\u00e9dication, Autel. La recherche plein texte dans les sous-titres (g\u00e9n\u00e9r\u00e9s automatiquement) permet de retrouver un passage pr\u00e9cis."));

  children.push(h2("5.3 Structure des donn\u00e9es"));
  children.push(
    makeTable(
      ["Champ", "Type", "Contraintes", "Description", "Valeurs possibles"],
      [
        ["id", "UUID", "PK, auto-g\u00e9n\u00e9r\u00e9", "Identifiant du stream", "\u2014"],
        ["title", "VARCHAR(255)", "NOT NULL", "Titre de l\u2019\u00e9v\u00e9nement", "Texte libre"],
        ["stream_key", "VARCHAR(100)", "UNIQUE, NOT NULL", "Cl\u00e9 de stream", "G\u00e9n\u00e9r\u00e9 par le provider"],
        ["status", "VARCHAR(20)", "NOT NULL", "\u00c9tat du stream", "scheduled, live, ended"],
        ["started_at", "TIMESTAMP", "NULLABLE", "D\u00e9but effectif du direct", "\u2014"],
        ["viewer_count", "INTEGER", "default 0", "Nombre de spectateurs actuels", "\u2014"],
        ["replay_url", "TEXT", "NULLABLE", "URL du replay", "URL Cloudflare/Mux"],
        ["chapters", "JSONB", "default '[]'", "Marqueurs de chapitres", "Array de {time, label}"],
      ],
      [18, 14, 22, 26, 20]
    )
  );

  children.push(h2("5.4 Logique m\u00e9tier"));
  children.push(body(
    "Le flux de diffusion fonctionne selon un cycle pr\u00e9cis : le administrateur planifie un \u00e9v\u00e9nement avec un titre, une date et heure. \u00c0 l\u2019heure pr\u00e9vue, le syst\u00e8me d\u00e9tecte le d\u00e9but de l\u2019encodage (ingest) et bascule automatiquement le statut en \u00ab live \u00bb, d\u00e9clenchant l\u2019affichage de la banni\u00e8re \u00ab EN DIRECT \u00bb et l\u2019envoi de notifications push aux utilisateurs abonn\u00e9s."
  ));
  children.push(body(
    "La mod\u00e9ration du chat en temps r\u00e9el repose sur un double syst\u00e8me : un filtre automatique bloque les messages contenant des mots inappropri\u00e9s ou des liens externes, et un mod\u00e9rateur humain peut bannir temporairement ou d\u00e9finitivement des utilisateurs. Les messages supprim\u00e9s sont remplac\u00e9s par un indicateur \u00ab message supprim\u00e9 \u00bb pour maintenir la coh\u00e9rence du fil de discussion."
  ));
  children.push(body(
    "Les marqueurs de chapitres sont ajout\u00e9s manuellement par l\u2019\u00e9quipe technique pendant le direct ou automatiquement apr\u00e8s coup via la d\u00e9tection de silence audio. Le bouton de don flottant redirige vers un formulaire int\u00e9gr\u00e9 avec les m\u00e9thodes de paiement accept\u00e9es (carte bancaire, mobile money, virement)."
  ));

  children.push(h2("5.5 Recommandations techniques"));
  children.push(body(
    "Deux solutions sont recommand\u00e9es pour l\u2019infrastructure de streaming : Cloudflare Stream et Mux. Cloudflare Stream offre une int\u00e9gration transparente avec le r\u00e9seau CDN de Cloudflare, une facturation \u00e0 l\u2019usage avantageuse et un lecteur vid\u00e9o personnalisable. Mux fournit des API de haute qualit\u00e9 pour l\u2019encodage en temps r\u00e9el, des sous-titres automatiques et des analytics d\u00e9taill\u00e9s sur l\u2019engagement spectateur."
  ));
  children.push(body(
    "Le protocole de streaming est HLS (HTTP Live Streaming) pour sa compatibilit\u00e9 universelle avec tous les navigateurs et appareils mobiles. Le lecteur vid\u00e9o utilise hls.js avec un fallback natif pour Safari. Le chat en temps r\u00e9el est impl\u00e9ment\u00e9 via Supabase Realtime (WebSockets), offrant une latence inf\u00e9rieure \u00e0 500 millisecondes pour les messages."
  ));

  children.push(h2("5.6 Consid\u00e9rations UX/Design"));
  children.push(body(
    "Le lecteur adopte un design immersif avec fond noir pour optimiser le contraste vid\u00e9o. Les commandes du lecteur sont minimalistes et apparaissent au survol ou au tapotement. La banni\u00e8re \u00ab EN DIRECT \u00bb utilise un fond rouge vif avec un l\u00e9ger effet de pulsation CSS pour attirer l\u2019attention sans \u00eatre agressif."
  ));
  children.push(body(
    "Le chat int\u00e9gr\u00e9 utilise des bulles de message avec un fond semi-transparent pour ne pas surcharger visuellement l\u2019\u00e9cran. Les messages sont limit\u00e9s \u00e0 200 caract\u00e8res pour encourager la concision. Le bouton de don flottant est un cercle dor\u00e9 avec une ic\u00f4ne de coeur, toujours visible mais non intrusif, avec une animation douce au survol."
  ));

  children.push(h2("5.7 Confidentialit\u00e9 et s\u00e9curit\u00e9"));
  children.push(body(
    "Les streams publics sont accessibles sans authentification pour maximiser la port\u00e9e de l\u2019\u00e9vang\u00e9lisation. Cependant, les replays de certains \u00e9v\u00e9nements (formations internes, rencontres de dirigeants) peuvent \u00eatre restreints aux membres authentifi\u00e9s via des tokens sign\u00e9s \u00e0 dur\u00e9e limit\u00e9e."
  ));
  children.push(body(
    "Les messages du chat sont soumis \u00e0 la m\u00eame politique de mod\u00e9ration que le reste de la plateforme. L\u2019historique du chat est conserv\u00e9 pendant 90 jours pour les besoins de mod\u00e9ration, puis automatiquement supprim\u00e9. Les transactions de dons sont s\u00e9curis\u00e9es par le protocole PCI-DSS via le prestataire de paiement, et aucune donn\u00e9e bancaire ne transite par les serveurs de La Conqu\u00eate."
  ));

  // ══════════════════════════════════════════════════════════════
  // 6. FEATURE 5: GROUPES DE MAISON
  // ══════════════════════════════════════════════════════════════
  children.push(h1("6. Agenda Interactif des Groupes de Maison"));

  children.push(h2("6.1 Description fonctionnelle d\u00e9taill\u00e9e"));
  children.push(body(
    "Les Groupes de Maison constituent un pilier fondamental de la vie communautaire de l\u2019\u00c9glise La Conqu\u00eate. La fonctionnalit\u00e9 d\u2019Agenda Interactif vise \u00e0 faciliter la d\u00e9couverte, le filtrage et l\u2019int\u00e9gration dans ces groupes de proximit\u00e9 gr\u00e2ce \u00e0 une exp\u00e9rience num\u00e9rique intuitive et engageante."
  ));
  children.push(body(
    "Le c\u0153ur de cette fonctionnalit\u00e9 est une carte interactive bas\u00e9e sur Leaflet (open source), affichant la localisation g\u00e9ographique de chaque groupe de maison avec des marqueurs personnalis\u00e9s. Chaque marqueur, au clic ou au tapotement, d\u00e9ploie une fiche d\u2019information d\u00e9taill\u00e9e : nom du groupe, responsable, jour et heure de rencontre, th\u00e9matique, nombre de participants et un bouton \u00ab Rejoindre ce groupe \u00bb."
  ));
  children.push(body(
    "La liste filtrable compl\u00e8te la carte en offrant des crit\u00e8res de recherche multiples : jour de la semaine, quartier, langue (fran\u00e7ais, anglais, lingala), type de groupe (\u00e9tude biblique, pri\u00e8re, jeunesse, couple). Les filtres fonctionnent en combinaison, permettant par exemple de trouver tous les groupes d\u2019\u00e9tude biblique en fran\u00e7ais le mercredi dans un quartier donn\u00e9. Le bouton \u00ab Rejoindre ce groupe \u00bb d\u00e9clenche automatiquement une notification au responsable du groupe et un accus\u00e9 de r\u00e9ception \u00e0 l\u2019utilisateur."
  ));

  children.push(h2("6.2 Parcours utilisateur (UX Flow)"));
  children.push(bodyNoIndent("D\u00e9couverte par la carte : L\u2019utilisateur acc\u00e8de \u00e0 la page des Groupes de Maison depuis le menu principal. La carte s\u2019affiche en plein \u00e9cran avec les marqueurs positionn\u00e9s. L\u2019utilisateur peut zoomer, d\u00e9placer et cliquer sur les marqueurs. Une barre de recherche rapide en haut permet de filtrer sans quitter la vue carte."));
  children.push(bodyNoIndent("D\u00e9couverte par la liste : Un bouton bascule permet de passer de la vue carte \u00e0 une vue liste avec cartes d\u00e9taill\u00e9es. Chaque carte affiche le nom du groupe, le jour et l\u2019heure, le quartier, le type et un extrait de la description. Les filtres avanc\u00e9s sont accessibles via un panneau glissant."));
  children.push(bodyNoIndent("Inscription \u00e0 un groupe : Apr\u00e8s avoir consult\u00e9 les d\u00e9tails d\u2019un groupe, l\u2019utilisateur clique sur \u00ab Rejoindre ce groupe \u00bb. Un modal de confirmation affiche un r\u00e9sum\u00e9 des informations pratiques (adresse, horaire, contact du responsable). La confirmation envoie automatiquement une notification au responsable et un email de bienvenue \u00e0 l\u2019utilisateur."));

  children.push(h2("6.3 Structure des donn\u00e9es"));
  children.push(
    makeTable(
      ["Champ", "Type", "Contraintes", "Description", "Valeurs possibles"],
      [
        ["id", "UUID", "PK, auto-g\u00e9n\u00e9r\u00e9", "Identifiant du groupe", "\u2014"],
        ["name", "VARCHAR(255)", "NOT NULL", "Nom du groupe", "Texte libre"],
        ["leader_name", "VARCHAR(100)", "NOT NULL", "Nom du responsable", "Texte libre"],
        ["leader_contact", "VARCHAR(255)", "NOT NULL", "Contact du responsable", "Email ou t\u00e9l\u00e9phone"],
        ["day_of_week", "VARCHAR(20)", "NOT NULL", "Jour de rencontre", "lundi, mardi, ..., dimanche"],
        ["meeting_time", "TIME", "NOT NULL", "Heure de rencontre", "18:00, 19:30, etc."],
        ["language", "VARCHAR(20)", "NOT NULL, default 'fr'", "Langue du groupe", "fr, en, ln, sw"],
        ["group_type", "VARCHAR(50)", "NOT NULL", "Type de groupe", "bible, priere, jeunesse, couple"],
        ["address", "TEXT", "NOT NULL", "Adresse de rencontre", "Texte libre"],
        ["latitude", "DECIMAL(10,7)", "NOT NULL", "Latitude pour la carte", "Coordonn\u00e9es GPS"],
        ["longitude", "DECIMAL(10,7)", "NOT NULL", "Longitude pour la carte", "Coordonn\u00e9es GPS"],
        ["description", "TEXT", "NULLABLE", "Description d\u00e9taill\u00e9e", "Texte libre"],
        ["capacity", "INTEGER", "default 15", "Capacit\u00e9 maximale", "Nombre entier"],
        ["is_active", "BOOLEAN", "default true", "Groupe actif ou inactif", "true / false"],
      ],
      [16, 14, 20, 26, 24]
    )
  );

  children.push(h2("6.4 Logique m\u00e9tier"));
  children.push(body(
    "Lorsqu\u2019un utilisateur clique sur \u00ab Rejoindre ce groupe \u00bb, le syst\u00e8me v\u00e9rifie d\u2019abord que l\u2019utilisateur est authentifi\u00e9, puis que le groupe a encore des places disponibles (en comparant le nombre de membres actuels \u00e0 la capacit\u00e9 d\u00e9clar\u00e9e). Si le groupe est complet, un message propose de rejoindre la liste d\u2019attente ou de contacter directement le responsable."
  ));
  children.push(body(
    "La notification envoy\u00e9e au responsable du groupe inclut le pr\u00e9nom, les centres d\u2019int\u00e9r\u00eat et le statut spirituel du nouvel arrivant (tels que d\u00e9clar\u00e9s lors de l\u2019onboarding), permettant au responsable de pr\u00e9parer un accueil personnalis\u00e9. Un doublon est \u00e9vit\u00e9 par un contr\u00f4le d\u2019unicit\u00e9 sur la paire user_id / group_id."
  ));

  children.push(h2("6.5 Recommandations techniques"));
  children.push(body(
    "La carte interactive est impl\u00e9ment\u00e9e avec React-Leaflet, un wrapper React de la biblioth\u00e8que Leaflet. Les tuiles de carte proviennent d\u2019OpenStreetMap pour un co\u00fbt nul et une couverture mondiale. Les marqueurs utilisent des ic\u00f4nes personnalis\u00e9es en SVG, diff\u00e9renci\u00e9es par couleur selon le type de groupe. La g\u00e9olocalisation de l\u2019utilisateur (avec consentement) permet de centrer automatiquement la carte sur sa position et de trier les groupes par proximit\u00e9."
  ));
  children.push(body(
    "Les filtres sont impl\u00e9ment\u00e9s c\u00f4t\u00e9 client pour une r\u00e9activit\u00e9 imm\u00e9diate, avec les donn\u00e9es des groupes pr\u00e9charg\u00e9es au montage du composant. Pour les performances, les donn\u00e9es de la carte sont mises en cache dans React Query avec une dur\u00e9e de validit\u00e9 de 15 minutes, \u00e9vitant des requ\u00eates redondantes."
  ));

  children.push(h2("6.6 Consid\u00e9rations UX/Design"));
  children.push(body(
    "La carte utilise un style de tuiles personnalis\u00e9 aux tons chauds pour s\u2019harmoniser avec la charte graphique de la plateforme. Les marqueurs sont suffisamment grands pour \u00eatre tapot\u00e9s facilement sur mobile (minimum 44x44 pixels). Le panneau de filtres utilise un design en accord\u00e9on pour \u00e9conomiser l\u2019espace, chaque cat\u00e9gorie de filtre \u00e9tant d\u00e9pliable individuellement."
  ));
  children.push(body(
    "Les fiches de d\u00e9tail des groupes utilisent un design en carte avec une photo du responsable (optionnelle), des badges color\u00e9s pour le jour et le type, et un bouton d\u2019action pro\u00e9minent en dor\u00e9. La transition entre la vue carte et la vue liste est anim\u00e9e pour maintenir la coh\u00e9rence spatiale."
  ));

  children.push(h2("6.7 Confidentialit\u00e9 et s\u00e9curit\u00e9"));
  children.push(body(
    "Les adresses des groupes de maison sont des informations sensibles. Par d\u00e9faut, seule la ville ou le quartier est affich\u00e9 publiquement. L\u2019adresse compl\u00e8te n\u2019est r\u00e9v\u00e9l\u00e9e qu\u2019aux membres authentifi\u00e9s ayant exprim\u00e9 le souhait de rejoindre le groupe. Le num\u00e9ro de t\u00e9l\u00e9phone du responsable n\u2019est jamais affich\u00e9 directement ; la communication passe par un formulaire de contact interne."
  ));
  children.push(body(
    "Les donn\u00e9es de g\u00e9olocalisation des utilisateurs ne sont collect\u00e9es qu\u2019avec un consentement explicite et ne sont jamais stock\u00e9es en base. Elles sont utilis\u00e9es exclusivement pour le centrage de la carte et le calcul de proximit\u00e9, puis imm\u00e9diatement oubli\u00e9es."
  ));

  // ══════════════════════════════════════════════════════════════
  // 7. FEATURE 6: CROISSANCE SPIRITUELLE
  // ══════════════════════════════════════════════════════════════
  children.push(h1("7. Suivi de Croissance Spirituelle"));

  children.push(h2("7.1 Description fonctionnelle d\u00e9taill\u00e9e"));
  children.push(body(
    "Le module de Suivi de Croissance Spirituelle est con\u00e7u pour accompagner chaque membre dans son parcours de foi au quotidien. Il combine quatre outils compl\u00e9mentaires : un verset du jour, un plan de lecture biblique avec suivi de progression, un espace de partage de t\u00e9moignages et un tableau de bord personnel des statistiques de croissance."
  ));
  children.push(body(
    "Le verset du jour est affich\u00e9 sur la page d\u2019accueil et dans un widget d\u00e9di\u00e9. Il est s\u00e9lectionn\u00e9 automatiquement depuis une base interne ou via une API biblique, avec la possibilit\u00e9 pour l\u2019\u00e9quipe pastorale de d\u00e9finir des versets th\u00e9matiques correspondant au calendrier liturgique ou aux s\u00e9ries de pr\u00e9dication en cours. Chaque verset est accompagn\u00e9 d\u2019une courte m\u00e9ditation ou d\u2019un commentaire inspirant."
  ));
  children.push(body(
    "Le plan de lecture biblique propose des parcours structur\u00e9s (lecture du Nouveau Testament en un an, Psaumes en 30 jours, Parcours th\u00e9matique) avec un syst\u00e8me de coches (checkboxes) pour marquer les chapitres lus et une barre de progression visuelle. L\u2019espace de t\u00e9moignages permet le partage sous trois formats : texte, photo et audio, avec un syst\u00e8me de mod\u00e9ration pour garantir la qualit\u00e9 et la pertinence des contenus publi\u00e9s."
  ));

  children.push(h2("7.2 Parcours utilisateur (UX Flow)"));
  children.push(bodyNoIndent("Verset du jour : D\u00e8s la connexion, l\u2019utilisateur voit le verset du jour dans un encart visuel attrayant sur la page d\u2019accueil. Il peut le partager sur les r\u00e9seaux sociaux, le copier ou le sauvegarder dans ses favoris. Un bouton \u00ab Verset pr\u00e9c\u00e9dent \u00bb permet de relire les versets des jours pass\u00e9s."));
  children.push(bodyNoIndent("Plan de lecture : L\u2019utilisateur acc\u00e8de au plan depuis le menu ou un widget de la page d\u2019accueil. La vue principale affiche le parcours en cours avec les chapitres organis\u00e9s par semaine. Chaque chapitre est cochable, avec une animation de validation satisfaisante. Une barre de progression circulaire indique le pourcentage de compl\u00e9tion global."));
  children.push(bodyNoIndent("T\u00e9moignages : La section t\u00e9moignages affiche un flux des t\u00e9moignages valid\u00e9s, sous forme de cartes avec le texte, une photo ou un lecteur audio. L\u2019utilisateur peut soumettre son propre t\u00e9moignage via un bouton flottant, en choisissant le format (texte, photo, audio) et en indiquant s\u2019il souhaite \u00eatre anonyme."));
  children.push(bodyNoIndent("Tableau de bord personnel : Un \u00e9cran de statistiques pr\u00e9sente les indicateurs cl\u00e9s : s\u00e9rie de jours cons\u00e9cutifs de lecture (streak), nombre total de chapitres lus, t\u00e9moignages partag\u00e9s, et une courbe d\u2019activit\u00e9 sur les 30 derniers jours. Ces donn\u00e9es motivent l\u2019utilisateur par un retour visuel positif sur son engagement."));

  children.push(h2("7.3 Structure des donn\u00e9es"));
  children.push(h3("Table reading_plans"));
  children.push(
    makeTable(
      ["Champ", "Type", "Contraintes", "Description", "Valeurs possibles"],
      [
        ["id", "UUID", "PK, auto-g\u00e9n\u00e9r\u00e9", "Identifiant du plan", "\u2014"],
        ["name", "VARCHAR(255)", "NOT NULL", "Nom du plan", "NT en 1 an, Psaumes 30j..."],
        ["description", "TEXT", "NULLABLE", "Description du plan", "Texte libre"],
        ["total_days", "INTEGER", "NOT NULL", "Dur\u00e9e totale en jours", "30, 90, 365"],
        ["readings", "JSONB", "NOT NULL", "Structure des lectures quotidiennes", "Array de {day, book, chapter}"],
        ["is_active", "BOOLEAN", "default true", "Plan disponible", "true / false"],
      ],
      [18, 14, 22, 26, 20]
    )
  );
  children.push(h3("Table reading_progress"));
  children.push(
    makeTable(
      ["Champ", "Type", "Contraintes", "Description", "Valeurs possibles"],
      [
        ["id", "UUID", "PK, auto-g\u00e9n\u00e9r\u00e9", "Identifiant", "\u2014"],
        ["user_id", "UUID", "FK \u2192 users, NOT NULL", "Utilisateur", "\u2014"],
        ["plan_id", "UUID", "FK \u2192 reading_plans, NOT NULL", "Plan concern\u00e9", "\u2014"],
        ["current_day", "INTEGER", "NOT NULL, default 1", "Jour actuel", "1 \u00e0 total_days"],
        ["completed_days", "INTEGER[]", "default '{}'", "Jours compl\u00e9t\u00e9s", "Array d\u2019entiers"],
        ["streak", "INTEGER", "default 0", "Jours cons\u00e9cutifs", "Nombre entier"],
        ["last_read_at", "DATE", "NULLABLE", "Dernier jour de lecture", "Date"],
      ],
      [18, 14, 24, 24, 20]
    )
  );
  children.push(h3("Table testimonies"));
  children.push(
    makeTable(
      ["Champ", "Type", "Contraintes", "Description", "Valeurs possibles"],
      [
        ["id", "UUID", "PK, auto-g\u00e9n\u00e9r\u00e9", "Identifiant du t\u00e9moignage", "\u2014"],
        ["user_id", "UUID", "FK \u2192 users, NOT NULL", "Auteur", "\u2014"],
        ["content", "TEXT", "NOT NULL", "Contenu textuel du t\u00e9moignage", "Texte libre"],
        ["media_url", "TEXT", "NULLABLE", "URL de la photo ou audio", "URL Supabase Storage"],
        ["media_type", "VARCHAR(10)", "NULLABLE", "Type de m\u00e9dia", "text, photo, audio"],
        ["is_anonymous", "BOOLEAN", "default false", "Publication anonyme", "true / false"],
        ["status", "VARCHAR(20)", "default 'pending'", "Statut de mod\u00e9ration", "pending, approved, rejected"],
        ["created_at", "TIMESTAMP", "NOT NULL, default now()", "Date de soumission", "\u2014"],
      ],
      [18, 14, 24, 24, 20]
    )
  );

  children.push(h2("7.4 Logique m\u00e9tier"));
  children.push(body(
    "Le calcul du streak (s\u00e9rie de jours cons\u00e9cutifs) fonctionne de la mani\u00e8re suivante : chaque jour \u00e0 minuit, le syst\u00e8me v\u00e9rifie si l\u2019utilisateur a coch\u00e9 au moins un chapitre la veille. Si oui, le streak est incr\u00e9ment\u00e9. Si l\u2019utilisateur a manqu\u00e9 un jour, le streak est r\u00e9initialis\u00e9 \u00e0 z\u00e9ro. Un m\u00e9canisme de gr\u00e2ce permet de conserver le streak si le manquement est d\u2019un jour, r\u00e9duisant la frustration."
  ));
  children.push(body(
    "La mod\u00e9ration des t\u00e9moignages suit un processus en deux \u00e9tapes : un filtre automatique v\u00e9rifie la longueur minimale (50 caract\u00e8res), d\u00e9tecte les contenus inappropri\u00e9s et bloque les liens externes. Les t\u00e9moignages passant ce filtre sont soumis \u00e0 une validation manuelle par un mod\u00e9rateur qui approuve ou rejette avec un motif. L\u2019auteur est notifi\u00e9 de la d\u00e9cision dans les deux cas."
  ));
  children.push(body(
    "Le verset du jour est s\u00e9lectionn\u00e9 selon une logique de priorit\u00e9 : si un pasteur a d\u00e9fini un verset th\u00e9matique pour la p\u00e9riode en cours, celui-ci est affich\u00e9. Sinon, le syst\u00e8me puise dans une base interne pr\u00e9remplie de 365 versets, s\u00e9lectionn\u00e9s pour leur diversit\u00e9 et leur port\u00e9e spirituelle, en respectant un \u00e9quilibre entre l\u2019Ancien et le Nouveau Testament."
  ));

  children.push(h2("7.5 Recommandations techniques"));
  children.push(body(
    "Le verset du jour est g\u00e9r\u00e9 via une table Supabase avec une colonne date comme cl\u00e9. Une fonction edge function g\u00e9n\u00e8re les versets automatiquement pour les jours non d\u00e9finis manuellement, en utilisant un algorithme de rotation garantissant la diversit\u00e9. Alternativement, l\u2019API Bible (bible.api) peut \u00eatre int\u00e9gr\u00e9e pour r\u00e9cup\u00e9rer le texte complet des versets dans la traduction Louis Segond 1910."
  ));
  children.push(body(
    "Le plan de lecture utilise un composant React avec un \u00e9tat local optimis\u00e9 par useReducer pour g\u00e9rer la logique de coches et de progression. La synchronisation avec Supabase est d\u00e9clench\u00e9e par un debounce de 500 millisecondes apr\u00e8s chaque action, \u00e9vitant les appels r\u00e9seau excessifs. Les fichiers audio des t\u00e9moignages sont enregistr\u00e9s via l\u2019API MediaRecorder du navigateur et stock\u00e9s en format WebM/Opus pour un rapport qualit\u00e9/taille optimal."
  ));

  children.push(h2("7.6 Consid\u00e9rations UX/Design"));
  children.push(body(
    "Le verset du jour est mis en valeur par un encart avec un fond cr\u00e8me subtil, une typographie \u00e9l\u00e9gante (italique serif) et une bordure dor\u00e9e fine sur le c\u00f4t\u00e9 gauche. La r\u00e9f\u00e9rence biblique est affich\u00e9e en petit, en dor\u00e9, sous le verset. Les boutons de partage utilisent les ic\u00f4nes reconnaissables des r\u00e9seaux sociaux."
  ));
  children.push(body(
    "Le plan de lecture utilise un design en calendrier avec les jours de la semaine en en-t\u00eate. Les chapitres coch\u00e9s affichent une animation de validation (coch\u00e9 vert avec l\u00e9ger rebond). La barre de progression circulaire utilise un d\u00e9grad\u00e9 dor\u00e9 et affiche le pourcentage au centre. Le tableau de bord des statistiques utilise des cartes avec des ic\u00f4nes illustratives et des animations num\u00e9riques (count-up) pour un effet gratifiant."
  ));

  children.push(h2("7.7 Confidentialit\u00e9 et s\u00e9curit\u00e9"));
  children.push(body(
    "Les statistiques de croissance spirituelle sont strictement personnelles et ne sont jamais partag\u00e9es avec d\u2019autres membres, m\u00eame de mani\u00e8re agr\u00e9g\u00e9e. Seul l\u2019utilisateur peut consulter son propre tableau de bord. Les t\u00e9moignages anonymes suppriment toute liaison avec le compte auteur dans l\u2019API publique, bien que la liaison soit conserv\u00e9e en base pour la mod\u00e9ration."
  ));
  children.push(body(
    "Les fichiers audio et photo soumis comme t\u00e9moignages sont soumis \u00e0 un scan antivirus c\u00f4t\u00e9 serveur avant stockage. La taille des fichiers est limit\u00e9e \u00e0 10 Mo pour les photos et 5 Mo pour les audio. Les m\u00e9tadonn\u00e9es EXIF des photos sont automatiquement supprim\u00e9es lors de l\u2019upload pour prot\u00e9ger la vie priv\u00e9e des auteurs."
  ));

  // ══════════════════════════════════════════════════════════════
  // 8. MATRICE DE PRIORISATION
  // ══════════════════════════════════════════════════════════════
  children.push(h1("8. Matrice de Priorisation (Impact \u00d7 Effort)"));
  children.push(body(
    "La matrice ci-dessous \u00e9value les six fonctionnalit\u00e9s selon leur impact strat\u00e9gique (de 1 \u00e0 5) et l\u2019effort de d\u00e9veloppement requis (de 1 \u00e0 5). Le score, calcul\u00e9 comme le rapport Impact divis\u00e9 par Effort, permet d\u2019identifier les fonctionnalit\u00e9s offrant le meilleur retour sur investissement. Un score \u00e9lev\u00e9 indique un impact fort pour un effort relatif mod\u00e9r\u00e9."
  ));
  children.push(
    makeTable(
      ["Fonctionnalit\u00e9", "Impact (1-5)", "Effort (1-5)", "Score (I/E)", "Quadrant"],
      [
        ["Onboarding Interactif", "4", "2", "2.00", "Quick Win"],
        ["Espace Utilisateur", "5", "3", "1.67", "Quick Win"],
        ["PWA", "4", "3", "1.33", "Major Project"],
        ["Lecteur Streaming", "5", "5", "1.00", "Major Project"],
        ["Groupes de Maison", "5", "3", "1.67", "Quick Win"],
        ["Croissance Spirituelle", "4", "4", "1.00", "Major Project"],
      ],
      [30, 17, 17, 18, 18]
    )
  );
  children.push(emptyPara(100));
  children.push(body(
    "L\u2019analyse en quadrants r\u00e9v\u00e8le trois Quick Wins (Onboarding, Espace Utilisateur, Groupes de Maison) qui doivent \u00eatre prioris\u00e9s dans la Phase 1. Les trois autres fonctionnalit\u00e9s sont des Major Projects \u00e0 fort impact mais n\u00e9cessitant un effort significatif, \u00e0 planifier dans les phases ult\u00e9rieures. Aucune fonctionnalit\u00e9 n\u2019est class\u00e9e comme Time Sink ou Fill-In, ce qui d\u00e9montre la coh\u00e9rence globale du cahier des charges."
  ));

  // ══════════════════════════════════════════════════════════════
  // 9. ROADMAP EN 3 PHASES
  // ══════════════════════════════════════════════════════════════
  children.push(h1("9. Roadmap en 3 Phases"));
  children.push(body(
    "La feuille de route ci-dessous organise le d\u00e9ploiement des fonctionnalit\u00e9s en trois phases progressives, chacune s\u2019appuyant sur les r\u00e9alisations de la pr\u00e9c\u00e9dente. Cette approche it\u00e9rative permet de livrer rapidement de la valeur tout en construisant une fondation technique solide."
  ));
  children.push(
    makeTable(
      ["Phase", "Fonctionnalit\u00e9", "Dur\u00e9e", "D\u00e9pendances"],
      [
        [{ text: "Phase 1 : MVP", bold: true }, { text: "Onboarding Interactif", bold: true }, "4 semaines", "Infrastructure Supabase"],
        [{ text: "Phase 1 : MVP", bold: true }, { text: "Espace Utilisateur (Profil + Pri\u00e8res)", bold: true }, "5 semaines", "Authentification Supabase"],
        [{ text: "Phase 1 : MVP", bold: true }, { text: "Groupes de Maison (Carte + Liste)", bold: true }, "4 semaines", "Donn\u00e9es g\u00e9ographiques"],
        [{ text: "Phase 2 : V2", bold: true }, { text: "PWA (Manifest + Service Worker + Push)", bold: true }, "5 semaines", "Phase 1 compl\u00e8te"],
        [{ text: "Phase 2 : V2", bold: true }, { text: "Lecteur Streaming (Live + Replay)", bold: true }, "7 semaines", "Infrastructure Cloudflare/Mux"],
        [{ text: "Phase 3 : V3", bold: true }, { text: "Croissance Spirituelle compl\u00e8te", bold: true }, "6 semaines", "Phase 2 compl\u00e8te"],
        [{ text: "Phase 3 : V3", bold: true }, { text: "Fonctionnalit\u00e9s innovantes (AI, gamification...)", bold: true }, "8 semaines", "Toutes les phases"],
      ],
      [18, 38, 16, 28]
    )
  );
  children.push(emptyPara(100));
  children.push(body(
    "La Phase 1 (MVP) est estim\u00e9e \u00e0 13 semaines (environ 3 mois) et couvre les trois Quick Wins identifi\u00e9s dans la matrice de priorisation. La Phase 2 (V2) ajoute la dimension connectivit\u00e9 avec la PWA et le streaming, pour une dur\u00e9e de 12 semaines (environ 3 mois). La Phase 3 (V3) parach\u00e8ve la plateforme avec la croissance spirituelle et les innovations, sur 14 semaines (environ 4 mois). Le d\u00e9lai total estim\u00e9 est de 39 semaines, soit environ 9 mois de d\u00e9veloppement continu."
  ));

  // ══════════════════════════════════════════════════════════════
  // 10. FONCTIONNALITÉS INNOVANTES SUPPLÉMENTAIRES
  // ══════════════════════════════════════════════════════════════
  children.push(h1("10. Fonctionnalit\u00e9s Innovantes Suppl\u00e9mentaires"));
  children.push(body(
    "Au-del\u00e0 des six fonctionnalit\u00e9s principales d\u00e9crites en d\u00e9tail, les pistes suivantes repr\u00e9sentent des opportunit\u00e9s d\u2019innovation compl\u00e9mentaires pour positionner La Conqu\u00eate \u00e0 la pointe de la transformation num\u00e9rique eccl\u00e9siale. Chacune de ces id\u00e9es m\u00e9rite une \u00e9tude de faisabilit\u00e9 d\u00e9di\u00e9e."
  ));

  children.push(h2("10.1 Recherche intelligente de pr\u00eaches par IA"));
  children.push(body(
    "Int\u00e9grer un moteur de recherche s\u00e9mantique permettant aux fid\u00e8les de retrouver un passage pr\u00e9cis d\u2019une pr\u00e9dication en saisissant un th\u00e8me, un verset ou un concept en langage naturel. L\u2019IA g\u00e9n\u00e8re des r\u00e9sum\u00e9s de pr\u00eaches et propose des recommandations personnalis\u00e9es bas\u00e9es sur l\u2019historique de consultation de l\u2019utilisateur et son parcours d\u2019onboarding."
  ));

  children.push(h2("10.2 Visite virtuelle de l\u2019\u00e9glise"));
  children.push(body(
    "Proposer une visite virtuelle immersive \u00e0 360 degr\u00e9s des locaux de l\u2019\u00e9glise, permettant aux nouveaux visiteurs de se familiariser avec l\u2019environnement avant leur premi\u00e8re venue physique. Cette fonctionnalit\u00e9 r\u00e9duit l\u2019appr\u00e9hension des premiers visiteurs en leur offrant un aper\u00e7u rassurant de l\u2019espace d\u2019accueil, de la salle de culte et des salles de groupes."
  ));

  children.push(h2("10.3 Support multilingue avanc\u00e9"));
  children.push(body(
    "\u00c9tendre la plateforme \u00e0 un support multilingue complet, incluant le fran\u00e7ais, l\u2019anglais, le lingala et le swahili, avec traduction automatique des contenus statiques et sous-titrage automatique des replays de cultes. Le syst\u00e8me d\u00e9tecte la langue pr\u00e9f\u00e9r\u00e9e de l\u2019utilisateur lors de l\u2019onboarding et adapte l\u2019interface en cons\u00e9quence."
  ));

  children.push(h2("10.4 Place de march\u00e9 communautaire"));
  children.push(body(
    "Cr\u00e9er un espace d\u2019entraide communautaire o\u00f9 les membres peuvent proposer des services (cours de soutien, r\u00e9parations, transport), mettre en vente des objets ou rechercher de l\u2019aide. Ce march\u00e9 interne renforce les liens communautaires au-del\u00e0 du cadre strictement spirituel et r\u00e9pond \u00e0 des besoins pratiques concrets des membres."
  ));

  children.push(h2("10.5 RSVP \u00e9v\u00e9nements avec synchronisation calendrier"));
  children.push(body(
    "Syst\u00e8me de r\u00e9servation en ligne pour les \u00e9v\u00e9nements sp\u00e9ciaux (conf\u00e9rences, retraites, concerts) avec g\u00e9n\u00e9ration automatique de fichiers .ics pour l\u2019ajout dans Google Calendar, Apple Calendar ou Outlook. Des rappels automatiques sont envoy\u00e9s 48 heures et 2 heures avant l\u2019\u00e9v\u00e9nement, avec gestion des capacit\u00e9s et listes d\u2019attente."
  ));

  children.push(h2("10.6 D\u00e9fis spirituels ludifi\u00e9s (Gamification)"));
  children.push(body(
    "Transformer le parcours de croissance spirituelle en d\u00e9fis communautaires avec un syst\u00e8me de badges et de classements amicaux. Par exemple, un d\u00e9fi \u00ab 30 jours de pri\u00e8re \u00bb ou \u00ab Lecture de l\u2019\u00c9vangile de Jean en 21 jours \u00bb avec suivi collectif, encourageant la participation par l\u2019\u00e9mulation positive plut\u00f4t que par la comp\u00e9tition."
  ));

  children.push(h2("10.7 Int\u00e9gration avec les logiciels de gestion d\u2019\u00e9glise"));
  children.push(body(
    "Connecter la plateforme avec des solutions de gestion d\u2019\u00e9glise reconnues comme ChurchTools ou Planning Center Online, permettant la synchronisation bidirectionnelle des membres, des \u00e9v\u00e9nements et du planning des b\u00e9n\u00e9voles. Cette int\u00e9gration \u00e9limine la double saisie et offre aux pasteurs une vue unifi\u00e9e de la communaut\u00e9."
  ));

  children.push(h2("10.8 Bulletin num\u00e9rique interactif"));
  children.push(body(
    "Remplacer le bulletin papier par un bulletin num\u00e9rique interactif consultable directement dans la plateforme ou t\u00e9l\u00e9chargeable au format PDF optimis\u00e9. Le bulletin int\u00e8gre des \u00e9l\u00e9ments interactifs : liens vers les chants du culte, vid\u00e9os de la semaine, formulaire de don int\u00e9gr\u00e9 et rappels d\u2019\u00e9v\u00e9nements \u00e0 venir, cr\u00e9ant un pont entre l\u2019information et l\u2019action."
  ));

  return {
    properties: {
      page: {
        size: { width: 11906, height: 16838, orientation: "portrait" },
        margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
      },
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: "Sp\u00e9cification Fonctionnelle \u2014 La Conqu\u00eate",
                font: FONT_BODY,
                size: 18,
                color: "808080",
                italics: true,
              }),
            ],
          }),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "PAGE  * arabic  * MERGEFORMAT", font: FONT_BODY, size: 18, color: "808080" }),
            ],
          }),
        ],
      }),
    },
    children: children,
  };
}

// ─── Build Document ─────────────────────────────────────────────
async function main() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT_BODY, size: 24, color: P.body },
          paragraph: { spacing: { line: LINE_SPACING } },
        },
      },
    },
    sections: [buildCover(), buildTOC(), buildBody()],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, "..", "download", "Spec_Fonctionnelle_La_Conquete.docx");
  fs.writeFileSync(outputPath, buffer);
  console.log("Document generated: " + outputPath);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});