const {
  Document, Packer, Paragraph, TextRun, Header, Footer,
  AlignmentType, HeadingLevel, PageNumber, PageBreak,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, TableOfContents, SectionType, VerticalAlign
} = require("docx");
const fs = require("fs");

// ── Pure B&W palette (consulting doc) ──
const P = { primary: "000000", body: "000000", secondary: "555555", accent: "333333", surface: "F5F5F5", white: "FFFFFF" };
const c = (hex) => hex;

// ── Component builders ──
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, spacing: { before: 480, after: 200 },
    children: [new TextRun({ text, bold: true, size: 32, font: "Times New Roman", color: c(P.primary) })]
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2, spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, size: 28, font: "Times New Roman", color: c(P.primary) })]
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3, spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, size: 26, font: "Times New Roman", color: c(P.primary) })]
  });
}
function body(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED, spacing: { line: 312 },
    children: [new TextRun({ text, size: 24, font: "Calibri", color: c(P.body) })]
  });
}
function bodyBold(label, text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED, spacing: { line: 312 },
    children: [
      new TextRun({ text: label, bold: true, size: 24, font: "Calibri", color: c(P.body) }),
      new TextRun({ text, size: 24, font: "Calibri", color: c(P.body) })
    ]
  });
}
function bullet(text, level = 0) {
  const indent = level * 360;
  return new Paragraph({
    bullet: { level }, spacing: { line: 312 },
    children: [new TextRun({ text, size: 24, font: "Calibri", color: c(P.body) })]
  });
}
function bulletBold(label, text, level = 0) {
  return new Paragraph({
    bullet: { level }, spacing: { line: 312 },
    children: [
      new TextRun({ text: label, bold: true, size: 24, font: "Calibri", color: c(P.body) }),
      new TextRun({ text, size: 24, font: "Calibri", color: c(P.body) })
    ]
  });
}
function spacer() { return new Paragraph({ spacing: { before: 60, after: 60 }, children: [] }); }
function note(text) {
  return new Paragraph({
    spacing: { line: 312, before: 80, after: 80 },
    children: [
      new TextRun({ text: "\u2139 ", bold: true, size: 22, font: "Calibri", color: c(P.secondary) }),
      new TextRun({ text, italics: true, size: 22, font: "Calibri", color: c(P.secondary) })
    ]
  });
}
function screenBox(title, lines) {
  const children = [
    new Paragraph({
      spacing: { before: 120, after: 60, line: 312 },
      children: [new TextRun({ text: `\u250C\u2500\u2500 ${title} \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`, size: 20, font: "Courier New", color: c(P.accent) })]
    })
  ];
  for (const line of lines) {
    children.push(new Paragraph({
      spacing: { line: 312 },
      children: [new TextRun({ text: `\u2502 ${line}`, size: 20, font: "Courier New", color: c(P.body) })]
    }));
  }
  children.push(new Paragraph({
    spacing: { before: 60, line: 312 },
    children: [new TextRun({ text: `\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500`, size: 20, font: "Courier New", color: c(P.accent) })]
  }));
  return children;
}

// ── Table builder helper ──
function makeTable(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map(h =>
          new TableCell({
            shading: { fill: c(P.accent), type: ShadingType.CLEAR },
            margins: { top: 60, bottom: 60, left: 100, right: 100 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, bold: true, size: 22, font: "Calibri", color: c(P.white) })] })]
          })
        )
      }),
      ...rows.map((row, i) =>
        new TableRow({
          children: row.map((cell, j) =>
            new TableCell({
              shading: i % 2 === 0 ? { fill: c(P.surface), type: ShadingType.CLEAR } : undefined,
              margins: { top: 40, bottom: 40, left: 100, right: 100 },
              verticalAlign: VerticalAlign.CENTER,
              children: [new Paragraph({
                alignment: j === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                children: [new TextRun({ text: cell, size: 22, font: "Calibri", color: c(P.body) })]
              })]
            })
          )
        })
      )
    ]
  });
}

// ══════════════════════════════════════════════════════════════════
// COVER SECTION
// ══════════════════════════════════════════════════════════════════
const coverSection = {
  properties: {
    page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } }
  },
  children: [
    new Paragraph({ spacing: { before: 4200 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: "GUIDE DE CONCEPTION", bold: true, size: 60, font: "Times New Roman", color: c(P.primary) })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 100 },
      children: [new TextRun({ text: "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500", size: 24, color: c(P.secondary) })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 400 },
      children: [new TextRun({ text: "Application de Gestion du D\u00e9partement Protocole/Accueil", size: 34, font: "Times New Roman", color: c(P.secondary) })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 100 },
      children: [new TextRun({ text: "\u00c9glise \u00c9vang\u00e9lique La Conqu\u00eate", size: 28, font: "Calibri", color: c(P.body) })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [new TextRun({ text: "Document de consultation \u2014 Architecture, \u00e9crans, et plan d\u2019action", size: 24, font: "Calibri", color: c(P.secondary) })]
    }),
    new Paragraph({ spacing: { before: 2400 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [new TextRun({ text: "Date : juillet 2026", size: 22, font: "Calibri", color: c(P.secondary) })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 80 },
      children: [new TextRun({ text: "Version : 1.0", size: 22, font: "Calibri", color: c(P.secondary) })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "R\u00e9alis\u00e9 par : Super Z (Consultant Technique)", size: 22, font: "Calibri", color: c(P.secondary) })]
    }),
  ]
};

// ══════════════════════════════════════════════════════════════════
// TOC SECTION
// ══════════════════════════════════════════════════════════════════
const tocSection = {
  properties: {
    page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 } }
  },
  headers: {
    default: new Header({
      children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "Guide Protocole \u2014 La Conqu\u00eate", size: 18, font: "Calibri", color: c(P.secondary), italics: true })]
      })]
    })
  },
  children: [
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: "Table des mati\u00e8res", bold: true, size: 32, font: "Times New Roman", color: c(P.primary) })]
    }),
    new TableOfContents("Table des mati\u00e8res", { hyperlink: true, headingStyleRange: "1-3" }),
    new Paragraph({
      children: [new TextRun({ text: "(Clic droit sur la table \u2192 \u00ab Mettre \u00e0 jour les champs \u00bb pour actualiser les num\u00e9ros de page)", italics: true, size: 20, font: "Calibri", color: c(P.secondary) })]
    }),
    new Paragraph({ children: [new TextRun({ break: 1, text: "" })] }),
  ],
};

// ══════════════════════════════════════════════════════════════════
// BODY SECTION
// ══════════════════════════════════════════════════════════════════
const bodyChildren = [];

// ══════════════════════════════════════════════════════════════════
// SECTION 1 : RECOMMANDATION DE STACK
// ══════════════════════════════════════════════════════════════════
bodyChildren.push(h1("1. Recommandation de stack technique"));
bodyChildren.push(body("Nous recommandons de construire le module Protocole sous forme de PWA (Progressive Web App) int\u00e9gr\u00e9e au codebase existant de La Conqu\u00eate (React + Vite + Supabase). Cette approche permet une installation directe sur les t\u00e9l\u00e9phones Android 4.6+ des agents sans passer par le Google Play Store, fonctionne hors-ligne pour le comptage, et r\u00e9utilise l\u2019authentification et l\u2019infrastructure d\u00e9j\u00e0 en place \u2014 le tout \u00e0 co\u00fbt z\u00e9ro."));
bodyChildren.push(note("Pourquoi une PWA et non une application native ? Aucun co\u00fbt de publication sur le Play Store. Mise \u00e0 jour instantan\u00e9e sans t\u00e9l\u00e9chargement. Fonctionne dans le navigateur Chrome Android d\u00e8s la version 4.6. L\u2019ic\u00f4ne s\u2019installe sur l\u2019\u00e9cran d\u2019accueil comme une vraie application."));

bodyChildren.push(h2("1.1 Avantages concrets pour l\u2019\u00e9glise"));
bodyChildren.push(bulletBold("Co\u00fbt z\u00e9ro : ", "Pas de frais de d\u00e9veloppement iOS, pas de compte d\u00e9veloppeur Google (25 $), pas de renouvellement annuel. Le code existe d\u00e9j\u00e0 dans le projet React actuel."));
bodyChildren.push(bulletBold("Installation simple : ", "L\u2019agent ouvre le lien dans Chrome, Chrome propose \u00ab Ajouter \u00e0 l\u2019\u00e9cran d\u2019accueil \u00bb. L\u2019application appara\u00eet avec l\u2019ic\u00f4ne de l\u2019\u00e9glise. Pas besoin de cr\u00e9er un compte Google."));
bodyChildren.push(bulletBold("Hors-ligne : ", "Le comptage d\u2019entr\u00e9e fonctionne m\u00eame sans connexion internet. Les donn\u00e9es sont stock\u00e9es localement puis envoy\u00e9es d\u00e8s que le Wi-Fi ou la 4G revient."));
bodyChildren.push(bulletBold("Mise \u00e0 jour automatique : ", "Quand le chef de protocole dit \u00ab mettez \u00e0 jour \u00bb, l\u2019agent actualise la page. C\u2019est tout. Pas de t\u00e9l\u00e9chargement, pas de \u00ab mise \u00e0 jour disponible \u00bb."));
bodyChildren.push(bulletBold("S\u00e9curit\u00e9 : ", "Chaque agent a son propre compte. S\u2019il quitte le d\u00e9partement, on d\u00e9sactive son compte. Les donn\u00e9es restent prot\u00e9g\u00e9es."));

bodyChildren.push(h2("1.2 Technologies utilis\u00e9es"));
bodyChildren.push(makeTable(
  ["Technologie", "R\u00f4le", "Pourquoi"],
  [
    ["React + Vite", "Frontend", "D\u00e9j\u00e0 en place, \u00e9quipe famili\u00e8re"],
    ["Supabase (gratuit)", "Base de donn\u00e9es + Auth", "H\u00e9bergement gratuit, pas besoin de Google Workspace"],
    ["Tailwind CSS", "Style", "D\u00e9j\u00e0 en place, design rapide"],
    ["Service Worker", "Hors-ligne", "Comptage m\u00eame sans internet"],
    ["jsPDF", "Export PDF", "Rapports avec en-t\u00eate \u00e9glise"],
    ["WhatsApp API (gratuite)", "Envoi rapports", "Le pasteur re\u00e7oit le PDF par WhatsApp"],
  ]
));

// ══════════════════════════════════════════════════════════════════
// SECTION 2 : ARCHITECTURE DE L'APPLICATION
// ══════════════════════════════════════════════════════════════════
bodyChildren.push(h1("2. Architecture de l\u2019application"));

bodyChildren.push(h2("2.1 Vue d\u2019ensemble"));
bodyChildren.push(body("L\u2019application est structur\u00e9e autour de quatre r\u00f4les principaux, chacun avec un \u00e9cran d\u2019accueil diff\u00e9rent et des permissions pr\u00e9cises. La navigation est mobile-first : un menu en bas de l\u2019\u00e9cran (barre de navigation) permet de passer d\u2019un \u00e9cran \u00e0 l\u2019autre en un seul tap. Chaque \u00e9cran est con\u00e7u pour \u00eatre utilis\u00e9 debout, avec des gros boutons et des informations claires."));

bodyChildren.push(h2("2.2 Les quatre r\u00f4les"));
bodyChildren.push(makeTable(
  ["R\u00f4le", "Qui", "Acc\u00e8s principal", "Peut modifier les donn\u00e9es ?"],
  [
    ["Agent d\u2019accueil", "Membre du d\u00e9partement Protocole", "Comptage + rapport de culte", "Oui, ses propres rapports uniquement"],
    ["Chef de protocole", "Responsable du d\u00e9partement", "Tous les rapports + gestion \u00e9quipe", "Oui, tous les rapports de son d\u00e9partement"],
    ["Pasteur", "Pasteur principal ou associ\u00e9", "Dashboard statistiques + PDF", "Non, consultation uniquement"],
    ["Secr\u00e9taire", "D\u00e9l\u00e9gu\u00e9e du pasteur", "Dashboard + export PDF", "Non, consultation + export uniquement"],
  ]
));

bodyChildren.push(h2("2.3 Matrice de permissions d\u00e9taill\u00e9e"));
bodyChildren.push(body("Le tableau ci-dessous pr\u00e9cise exactement ce que chaque r\u00f4le peut faire dans l\u2019application. Un \u00ab Oui \u00bb signifie que le bouton ou l\u2019\u00e9cran est visible et fonctionnel. Un \u00ab Non \u00bb signifie que l\u2019\u00e9l\u00e9ment est masqu\u00e9 ou d\u00e9sactiv\u00e9."));

bodyChildren.push(makeTable(
  ["Fonctionnalit\u00e9", "Agent", "Chef Protocole", "Pasteur", "Secr\u00e9taire"],
  [
    ["D\u00e9marrer un comptage", "Oui", "Oui", "Non", "Non"],
    ["Incr\u00e9menter un espace", "Oui", "Oui", "Non", "Non"],
    ["Soumettre un rapport de culte", "Oui", "Oui", "Non", "Non"],
    ["Saisir un nouveau venu", "Oui", "Oui", "Non", "Non"],
    ["Voir ses propres rapports", "Oui", "Oui", "Non", "Non"],
    ["Voir tous les rapports du d\u00e9partement", "Non", "Oui", "Non", "Non"],
    ["Compiler/valider les rapports", "Non", "Oui", "Non", "Non"],
    ["Assigner les agents aux portes", "Non", "Oui", "Non", "Non"],
    ["Voir le dashboard statistiques", "Non", "Oui", "Oui", "Oui"],
    ["Basculer jour/semaine/mois", "Non", "Oui", "Oui", "Oui"],
    ["Exporter en PDF", "Non", "Oui", "Oui", "Oui"],
    ["Envoyer par WhatsApp", "Non", "Oui", "Oui", "Oui"],
    ["Configurer les espaces de comptage", "Non", "Oui", "Non", "Non"],
    ["Voir les comparatifs entre agents", "Non", "Oui", "Oui", "Oui"],
    ["G\u00e9rer les utilisateurs du d\u00e9partement", "Non", "Oui", "Non", "Non"],
  ]
));

bodyChildren.push(h2("2.4 Navigation et structure des \u00e9crans"));
bodyChildren.push(body("Chaque r\u00f4le a sa propre barre de navigation en bas de l\u2019\u00e9cran. Les \u00e9crans sont les suivants :"));

bodyChildren.push(h3("Agent d\u2019accueil"));
bodyChildren.push(bullet("Accueil (3 boutons rapides : Compter, Nouveaux venus, Rapport)"));
bodyChildren.push(bullet("Comptage (\u00e9cran plein avec gros boutons + par espace)"));
bodyChildren.push(bullet("Nouveau venu (formulaire rapide)"));
bodyChildren.push(bullet("Rapport (formulaire du culte)"));
bodyChildren.push(bullet("Historique (ses rapports pass\u00e9s, lecture seule)"));

bodyChildren.push(h3("Chef de protocole"));
bodyChildren.push(bullet("Accueil (r\u00e9sum\u00e9 du jour + actions rapides)"));
bodyChildren.push(bullet("Cultes (liste des cultes, compilation, validation)"));
bodyChildren.push(bullet("\u00c9quipe (assignation des agents, performance)"));
bodyChildren.push(bullet("Statistiques (m\u00eames KPIs que le pasteur)"));
bodyChildren.push(bullet("Configuration (espaces de comptage, param\u00e8tres)"));

bodyChildren.push(h3("Pasteur / Secr\u00e9taire"));
bodyChildren.push(bullet("Dashboard (KPIs avec info-bulles, toggle jour/semaine/mois)"));
bodyChildren.push(bullet("D\u00e9tails (drill-down par culte, par p\u00e9riode)"));
bodyChildren.push(bullet("Export (g\u00e9n\u00e9ration PDF + envoi WhatsApp)"));

bodyChildren.push(h2("2.5 Flux de donn\u00e9es global"));
bodyChildren.push(body("Le sch\u00e9ma de flux est le suivant : l\u2019agent d\u2019accueil compte les entr\u00e9es via les gros boutons de l\u2019\u00e9cran de comptage. Pendant ce temps, il note le nombre de nouveaux venus. Apr\u00e8s le culte, il remplit le rapport d\u00e9taill\u00e9 (hommes, femmes, enfants, incidents). Le chef de protocole compile les rapports de tous les agents, v\u00e9rifie les chiffres et valide. Le pasteur ouvre son dashboard et voit les statistiques \u00e0 jour, avec la possibilit\u00e9 d\u2019exporter en PDF."));
bodyChildren.push(note("Les nouveaux venus sont transf\u00e9r\u00e9s au d\u00e9partement \u00c9vang\u00e9lisation qui remplit le formulaire complet. Le protocole ne fait que compter le nombre et capturer le nom/t\u00e9l\u00e9phone/quartier pour un suivi rapide."));

// ══════════════════════════════════════════════════════════════════
// SECTION 3 : \u00c9CRANS D\u00c9TAILL\u00c9S
// ══════════════════════════════════════════════════════════════════
bodyChildren.push(h1("3. \u00c9crans d\u00e9taill\u00e9s (wireframes textuels)"));
bodyChildren.push(body("Cette section d\u00e9crit chaque \u00e9cran tel qu\u2019il appara\u00eet sur un t\u00e9l\u00e9phone Android. Les descriptions sont mobile-first : tout est pens\u00e9 pour un \u00e9cran de 5 \u00e0 6 pouces, utilisable \u00e0 une main, avec des gros boutons tactiles."));

// ── 3.1 Ecran d'accueil agent ──
bodyChildren.push(h2("3.1 \u00c9cran d\u2019accueil agent"));
bodyChildren.push(body("C\u2019est le premier \u00e9cran que voit l\u2019agent apr\u00e8s connexion. Il doit permettre d\u2019agir en moins de 3 secondes. Le design est \u00e9pur\u00e9 : trois grands boutons color\u00e9s occupent le centre de l\u2019\u00e9cran."));
bodyChildren.push(...screenBox("\u00c9CRAN ACCUEIL AGENT", [
  "\u2502  [En-t\u00eate : Logo \u00e9glise + \u00ab D\u00e9partement Protocole \u00bb]",
  "\u2502  [Salutation : \u00ab Bonjour, Marie \u00bb]",
  "\u2502  [Indicateur connexion : \u25cf En ligne  ou  \u25cb Hors-ligne]",
  "\u2502  ",
  "\u2502  \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510",
  "\u2502  \u2502   [  +  ]   COMPTER LES ENTR\u00c9ES     \u2502",
  "\u2502  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518",
  "\u2502  ",
  "\u2502  \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510",
  "\u2502  \u2502   [  \u2709  ]  NOUVEAUX VENUS          \u2502",
  "\u2502  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518",
  "\u2502  ",
  "\u2502  \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510",
  "\u2502  \u2502   [  \u270e  ]  RAPPORT DE CULTE         \u2502",
  "\u2502  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518",
  "\u2502  ",
  "\u2502  [Dernier rapport : Dim 13 juil. \u2014 347 personnes]",
  "\u2502  ",
  "\u2502  [=== Barre de navigation : Accueil | Historique | Profil ===]",
]));

bodyChildren.push(h3("Actions d\u00e9taill\u00e9es"));
bodyChildren.push(bulletBold("Tap sur \u00ab Compter les entr\u00e9es \u00bb : ", "Ouvre l\u2019\u00e9cran de comptage. Si un comptage est d\u00e9j\u00e0 en cours, reprend l\u00e0 o\u00f9 il \u00e9tait (les chiffres sont m\u00e9moris\u00e9s). Si aucun comptage n\u2019est en cours, cr\u00e9e une nouvelle session avec un choix de type de culte (dimanche matin, dimanche soir, mercredi, veill\u00e9e, sp\u00e9cial)."));
bodyChildren.push(bulletBold("Tap sur \u00ab Nouveaux venus \u00bb : ", "Ouvre le formulaire rapide de capture d\u2019un nouveau venu. L\u2019agent saisit nom, t\u00e9l\u00e9phone, quartier. Ces donn\u00e9es sont transmises au d\u00e9partement \u00c9vang\u00e9lisation."));
bodyChildren.push(bulletBold("Tap sur \u00ab Rapport de culte \u00bb : ", "Ouvre le formulaire de rapport d\u00e9taill\u00e9 apr\u00e8s le culte. Les chiffres du comptage y sont pr\u00e9-remplis automatiquement."));

// ── 3.2 Ecran de comptage ──
bodyChildren.push(h2("3.2 \u00c9cran de comptage"));
bodyChildren.push(body("C\u2019est l\u2019\u00e9cran le plus utilis\u00e9. L\u2019agent est debout \u00e0 la porte, le t\u00e9l\u00e9phone \u00e0 la main. Chaque tap doit \u00eatre instantan\u00e9, sans confirmation. Les boutons sont tr\u00e8s grands (minimum 80px de haut) pour \u00eatre faciles \u00e0 toucher."));

bodyChildren.push(...screenBox("\u00c9CRAN COMPTAGE", [
  "\u2502  [En-t\u00eate : \u00ab Comptage \u2014 Dimanche Matin \u00bb]",
  "\u2502  [Total g\u00e9n\u00e9ral : 127]",
  "\u2502  ",
  "\u2502  \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510",
  "\u2502  \u2502  BALCON          [  \u2212  ]   34   [  +  ]  \u2502",
  "\u2502  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518",
  "\u2502  ",
  "\u2502  \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510",
  "\u2502  \u2502  C\u00d4T\u00c9 GAUCHE    [  \u2212  ]   45   [  +  ]  \u2502",
  "\u2502  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518",
  "\u2502  ",
  "\u2502  \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510",
  "\u2502  \u2502  C\u00d4T\u00c9 DROIT     [  \u2212  ]   28   [  +  ]  \u2502",
  "\u2502  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518",
  "\u2502  ",
  "\u2502  \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510",
  "\u2502  \u2502  RANG\u00c9E A        [  \u2212  ]   12   [  +  ]  \u2502",
  "\u2502  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518",
  "\u2502  ",
  "\u2502  \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510",
  "\u2502  \u2502  RANG\u00c9E B        [  \u2212  ]    8   [  +  ]  \u2502",
  "\u2502  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518",
  "\u2502  ",
  "\u2502  [  \u2713  TERMINER ET SAUVEGARDER  ]",
  "\u2502  ",
  "\u2502  [  \u2190  Retour  ]",
]));

bodyChildren.push(h3("R\u00e8gles de fonctionnement"));
bodyChildren.push(bullet("Les espaces (balcon, c\u00f4t\u00e9 gauche, etc.) sont configur\u00e9s par le chef de protocole. Si un espace est ajout\u00e9 ou supprim\u00e9, tous les agents le voient imm\u00e9diatement."));
bodyChildren.push(bullet("Le bouton \u00ab + \u00bb ajoute 1 personne. Le bouton \u00ab \u2212 \u00bb en retire 1 (si l\u2019agent a compt\u00e9 par erreur). Pas de confirmation demand\u00e9e."));
bodyChildren.push(bullet("Le total g\u00e9n\u00e9ral en haut se met \u00e0 jour \u00e0 chaque tap."));
bodyChildren.push(bullet("Un appui long (maintenir 2 secondes) sur le \u00ab + \u00bb ouvre un clavier num\u00e9rique pour saisir un nombre directement (utile si un groupe de 15 personnes entre d\u2019un coup)."));
bodyChildren.push(bullet("Le bouton \u00ab Terminer et sauvegarder \u00bb enregistre le comptage et propose de passer au rapport de culte."));
bodyChildren.push(bullet("En mode hors-ligne, un indicateur \u00ab Sauvegarde locale \u00bb s\u2019affiche. Les donn\u00e9es sont envoy\u00e9es automatiquement d\u00e8s le retour de connexion."));

// ── 3.3 Ecran rapport de culte ──
bodyChildren.push(h2("3.3 \u00c9cran rapport de culte"));
bodyChildren.push(body("Apr\u00e8s le comptage, l\u2019agent remplit ce formulaire pour compiler les chiffres d\u00e9taill\u00e9s du culte. Le total du comptage est pr\u00e9-rempli mais peut \u00eatre modifi\u00e9."));

bodyChildren.push(...screenBox("\u00c9CRAN RAPPORT DE CULTE", [
  "\u2502  [En-t\u00eate : \u00ab Rapport \u2014 Dimanche Matin 13 juil. \u00bb]",
  "\u2502  ",
  "\u2502  Type de culte : [Dimanche Matin  \u25bc]",
  "\u2502  Agent         : [Marie N.       \u25bc]",
  "\u2502  ",
  "\u2502  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
  "\u2502  COMPTAGE (pr\u00e9-rempli du comptage)",
  "\u2502  Total compt\u00e9  : [  127  ] (auto)",
  "\u2502  ",
  "\u2502  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
  "\u2502  R\u00c9PARTITION",
  "\u2502  Hommes         : [  42  ]",
  "\u2502  Femmes         : [  58  ]",
  "\u2502  Enfants        : [  27  ]",
  "\u2502  ",
  "\u2502  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
  "\u2502  NOUVEAUX VENUS",
  "\u2502  Nombre de nouveaux venus : [  8  ]",
  "\u2502  (D\u00e9tail saisi s\u00e9par\u00e9ment dans l'\u00e9cran Nouveau Venu)",
  "\u2502  ",
  "\u2502  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
  "\u2502  INCIDENTS / OBSERVATIONS",
  "\u2502  [                                                    ]",
  "\u2502  [  Zone de texte libre (optionnel)                   ]",
  "\u2502  [                                                    ]",
  "\u2502  ",
  "\u2502  [       \u2713  SOUMETTRE LE RAPPORT       ]",
  "\u2502  [       \u2190  Annuler                    ]",
]));

bodyChildren.push(h3("R\u00e8gles de fonctionnement"));
bodyChildren.push(bullet("Le \u00ab Total compt\u00e9 \u00bb est pr\u00e9-rempli avec le chiffre de l\u2019\u00e9cran de comptage. L\u2019agent peut le modifier si le comptage manuel diff\u00e8re."));
bodyChildren.push(bullet("Hommes + Femmes + Enfants ne doivent pas forc\u00e9ment \u00e9galer le total compt\u00e9 (les chiffres viennent de sources diff\u00e9rentes : comptage aux portes vs. observation dans la salle)."));
bodyChildren.push(bullet("Le champ \u00ab Incidents \u00bb est libre. Exemples : \u00ab coupure de courant \u00bb, \u00ab deux personnes malades \u00bb, \u00ab ouverture tardive des portes \u00bb."));
bodyChildren.push(bullet("Apr\u00e8s soumission, un message de confirmation s\u2019affiche : \u00ab Rapport envoy\u00e9 avec succ\u00e8s \u00bb avec un bouton \u00ab Retour \u00e0 l\u2019accueil \u00bb."));
bodyChildren.push(bullet("Le chef de protocole voit le rapport dans la liste des rapports en attente de validation."));

// ── 3.4 Ecran nouveau venu ──
bodyChildren.push(h2("3.4 \u00c9cran nouveau venu"));
bodyChildren.push(body("Cet \u00e9cran permet \u00e0 l\u2019agent de protocole de capturer rapidement les informations d\u2019un nouveau venu. Le formulaire est court (4 champs) pour ne pas ralentir l\u2019accueil. Les informations compl\u00e8tes seront collect\u00e9es par le d\u00e9partement \u00c9vang\u00e9lisation."));

bodyChildren.push(...screenBox("\u00c9CRAN NOUVEAU VENU", [
  "\u2502  [En-t\u00eate : \u00ab Nouveau Venu \u00bb]",
  "\u2502  [Culte : Dimanche Matin 13 juil.]",
  "\u2502  ",
  "\u2502  Nom complet *",
  "\u2502  [                                          ]",
  "\u2502  ",
  "\u2502  T\u00e9l\u00e9phone",
  "\u2502  [  +243   ] [                              ]",
  "\u2502  ",
  "\u2502  Quartier",
  "\u2502  [                          \u25bc  ]",
  "\u2502  ",
  "\u2502  Comment avez-vous connu l'\u00e9glise ?",
  "\u2502  (  ) Un ami / un membre",
  "\u2502  (  ) R\u00e9seaux sociaux",
  "\u2502  (  ) Invitation personnelle",
  "\u2502  (  ) Passage devant l'\u00e9glise",
  "\u2502  (  ) Autre",
  "\u2502  ",
  "\u2502  Notes (optionnel)",
  "\u2502  [                                          ]",
  "\u2502  ",
  "\u2502  [       \u2713  ENREGISTRER       ]",
  "\u2502  [    +  Ajouter un autre     ]",
  "\u2502  [       \u2190  Retour          ]",
]));

bodyChildren.push(h3("R\u00e8gles de fonctionnement"));
bodyChildren.push(bullet("Seul le nom est obligatoire. Le t\u00e9l\u00e9phone et le quartier sont optionnels mais fortement recommand\u00e9s."));
bodyChildren.push(bullet("Le pr\u00e9fixe t\u00e9l\u00e9phonique est pr\u00e9-rempli avec +243 (RDC) mais peut \u00eatre chang\u00e9."));
bodyChildren.push(bullet("Apr\u00e8s enregistrement, le bouton \u00ab Ajouter un autre \u00bb permet de saisir un autre nouveau venu sans revenir \u00e0 l\u2019accueil. C\u2019est tr\u00e8s pratique quand plusieurs nouveaux venus arrivent ensemble."));
bodyChildren.push(bullet("Les informations sont automatiquement transmises au d\u00e9partement \u00c9vang\u00e9lisation qui verra une notification \u00ab 8 nouveaux venus \u00e0 contacter \u00bb."));
bodyChildren.push(bullet("Un doublon est d\u00e9tect\u00e9 si le m\u00eame nom et le m\u00eame num\u00e9ro de t\u00e9l\u00e9phone existent d\u00e9j\u00e0 dans les 30 derniers jours. Dans ce cas, un message s\u2019affiche : \u00ab Cette personne a d\u00e9j\u00e0 \u00e9t\u00e9 enregistr\u00e9e le [date]. Voulez-vous quand m\u00eame l\u2019ajouter ? \u00bb"));

// ── 3.5 Dashboard Pasteur ──
bodyChildren.push(h2("3.5 Dashboard Pasteur"));
bodyChildren.push(body("Le dashboard du pasteur est con\u00e7u pour \u00eatre lu en 30 secondes. Design \u00e9pur\u00e9 : de petites cartes avec un chiffre gros et clair, et un bouton \u00ab i \u00bb qui explique ce que chaque chiffre veut dire. Le pasteur n\u2019a pas besoin de savoir comment le syst\u00e8me fonctionne, il veut juste voir les r\u00e9sultats."));

bodyChildren.push(...screenBox("DASHBOARD PASTEUR", [
  "\u2502  [En-t\u00eate : \u00ab Tableau de bord \u00bb]",
  "\u2502  [Toggle :  Jour  |  Semaine  |  Mois  ]",
  "\u2502  [P\u00e9riode : Dim. 6 juil. \u2013 Sam. 12 juil. 2026]",
  "\u2502  ",
  "\u2502  \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510 \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510",
  "\u2502  \u2502  ASSISTANCE       [i] \u2502 \u2502  NOUVEAUX VENUS  [i] \u2502",
  "\u2502  \u2502     1 247           \u2502 \u2502       38           \u2502",
  "\u2502  \u2502  \u2191 +12% vs sem. pr. \u2502 \u2502  \u2193 -5% vs sem. pr. \u2502",
  "\u2502  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518 \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518",
  "\u2502  ",
  "\u2502  \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510 \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510",
  "\u2502  \u2502  TAUX DE RETOUR  [i] \u2502 \u2502  PAR CULTE       [i] \u2502",
  "\u2502  \u2502     42%            \u2502 \u2502  Voir d\u00e9tails \u2192     \u2502",
  "\u2502  \u2502  \u2191 +3 pts         \u2502 \u2502  Dim. am: 347       \u2502",
  "\u2502  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518 \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518",
  "\u2502  ",
  "\u2502  \u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510",
  "\u2502  \u2502  PERFORMANCE \u00c9QUIPE                   [i]  \u2502",
  "\u2502  \u2502  Marie N. : 3 rapports   |   Jean P. : 2     \u2502",
  "\u2502  \u2502  Total : 5 rapports / 5 cultes = 100%       \u2502",
  "\u2502  \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518",
  "\u2502  ",
  "\u2502  [  \u2b07  T\u00c9L\u00c9CHARGER PDF  ]  [  \u2709  ENVOYER PAR WHATSAPP  ]",
]));

bodyChildren.push(h3("Actions d\u00e9taill\u00e9es"));
bodyChildren.push(bulletBold("Toggle Jour/Semaine/Mois : ", "Change la p\u00e9riode d\u2019affichage de tous les KPIs en un seul tap. Par d\u00e9faut, la vue \u00ab Semaine \u00bb est affich\u00e9e au chargement."));
bodyChildren.push(bulletBold("Bouton \u00ab i \u00bb (info-bulle) : ", "Affiche une petite fen\u00eatre qui explique ce que le chiffre signifie. Les textes exacts sont dans la section 4 de ce document. Dispara\u00eet au tap suivant."));
bodyChildren.push(bulletBold("Fl\u00e8che \u2191 ou \u2193 : ", "Montre la tendance par rapport \u00e0 la p\u00e9riode pr\u00e9c\u00e9dente. Vert pour positif, rouge pour n\u00e9gatif (sauf pour les nouveaux venus o\u00f9 la baisse est toujours rouge)."));
bodyChildren.push(bulletBold("T\u00e9l\u00e9charger PDF : ", "G\u00e9n\u00e8re un rapport PDF avec le logo de l\u2019\u00e9glise, l\u2019en-t\u00eate \u00ab \u00c9glise \u00c9vang\u00e9lique La Conqu\u00eate \u00bb, la date, les KPIs actuels et un tableau d\u00e9taill\u00e9 par culte."));
bodyChildren.push(bulletBold("Envoyer par WhatsApp : ", "Ouvre WhatsApp avec le PDF en pi\u00e8ce jointe, pr\u00eat \u00e0 envoyer au destinataire par d\u00e9faut (le num\u00e9ro du pasteur est pr\u00e9-configur\u00e9)."));

// ── 3.6 Dashboard Chef Protocole ──
bodyChildren.push(h2("3.6 Dashboard Chef de protocole"));
bodyChildren.push(body("Le chef de protocole a un r\u00f4le central : il g\u00e8re l\u2019\u00e9quipe, compile les rapports et s\u2019assure que tout est en ordre. Son dashboard est plus d\u00e9taill\u00e9 que celui du pasteur."));

bodyChildren.push(...screenBox("DASHBOARD CHEF PROTOCOLE", [
  "\u2502  [En-t\u00eate : \u00ab Chef de Protocole \u00bb]",
  "\u2502  [Barre de nav : Accueil | Cultes | \u00c9quipe | Stats | Config]",
  "\u2502  ",
  "\u2502  RAPIDE : [ + Nouveau culte ] [ Voir les non-valid\u00e9s (2) ]",
  "\u2502  ",
  "\u2502  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
  "\u2502  CULTES DE CETTE SEMAINE",
  "\u2502  ",
  "\u2502  \u250c Dim. 13 juil. Matin  | 347 pers. | 8 nv | \u2713 OK \u2510",
  "\u2502  \u2502 Agent : Marie N.         Jean P.         \u2514",
  "\u2502  ",
  "\u2502  \u250c Dim. 13 juil. Soir   | 189 pers. | 5 nv | \u26a0 En attente \u2510",
  "\u2502  \u2502 Agent : Pierre K. (rapport manquant)        \u2514",
  "\u2502  ",
  "\u2502  \u250c Mer. 16 juil.         | ---      | --- | \u25cb \u00c0 venir \u2510",
  "\u2502  \u2502 Agents non assign\u00e9s                            \u2514",
  "\u2502  ",
  "\u2502  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
  "\u2502  PERFORMANCE \u00c9QUIPE (cette semaine)",
  "\u2502  ",
  "\u2502  Marie N.     : 3/3 rapports \u2713    [Voir]",
  "\u2502  Jean P.      : 2/3 rapports \u26a0    [Rappeler]",
  "\u2502  Pierre K.    : 1/3 rapports \u2717    [Rappeler]",
  "\u2502  ",
  "\u2502  [  COMPILER ET ENVOYER AU PASTEUR  ]",
]));

bodyChildren.push(h3("Actions d\u00e9taill\u00e9es"));
bodyChildren.push(bulletBold("Gestion des cultes : ", "Le chef voit tous les cultes de la semaine. Chaque culte montre le statut : OK (rapport valid\u00e9), En attente (rapport soumis mais non valid\u00e9), ou \u00c0 venir."));
bodyChildren.push(bulletBold("Validation : ", "Le chef tape sur un culte \u00ab En attente \u00bb pour voir le d\u00e9tail et valider. Il peut modifier les chiffres avant validation si n\u00e9cessaire."));
bodyChildren.push(bulletBold("Rappeler un agent : ", "Si un agent n\u2019a pas soumis son rapport, le bouton \u00ab Rappeler \u00bb ouvre WhatsApp avec un message pr\u00e9-rempli : \u00ab Bonjour [Nom], le rapport du culte de [date] n\u2019a pas encore \u00e9t\u00e9 soumis. Merci de le compl\u00e9ter. \u00bb"));
bodyChildren.push(bulletBold("Compiler et envoyer : ", "G\u00e9n\u00e8re un rapport PDF compil\u00e9 de tous les cultes de la semaine et l\u2019envoie au pasteur par WhatsApp."));
bodyChildren.push(bulletBold("Assigner des agents : ", "Avant chaque culte, le chef assigne les agents aux portes. Cela permet de suivre qui \u00e9tait responsable de quel espace."));

// ── 3.7 Ecran config espaces ──
bodyChildren.push(h2("3.7 \u00c9cran de configuration des espaces"));
bodyChildren.push(body("Cet \u00e9cran est r\u00e9serv\u00e9 au chef de protocole. Il permet d\u2019ajouter, modifier ou supprimer les espaces de comptage. C\u2019est le seul \u00e9cran de \u00ab configuration \u00bb de l\u2019application."));

bodyChildren.push(...screenBox("\u00c9CRAN CONFIG ESPACES", [
  "\u2502  [En-t\u00eate : \u00ab Configuration \u2014 Espaces de comptage \u00bb]",
  "\u2502  ",
  "\u2502  ESPACES ACTIFS",
  "\u2502  ",
  "\u2502  1. Balcon                    [  \u270e  ] [  \u2716  ]",
  "\u2502  2. C\u00f4t\u00e9 gauche               [  \u270e  ] [  \u2716  ]",
  "\u2502  3. C\u00f4t\u00e9 droit                [  \u270e  ] [  \u2716  ]",
  "\u2502  4. Rang\u00e9e A                   [  \u270e  ] [  \u2716  ]",
  "\u2502  5. Rang\u00e9e B                   [  \u270e  ] [  \u2716  ]",
  "\u2502  ",
  "\u2502  [  +  AJOUTER UN ESPACE  ]",
  "\u2502  ",
  "\u2502  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",
  "\u2502  AUTRES PARAM\u00c8TRES",
  "\u2502  ",
  "\u2502  Pr\u00e9fixe t\u00e9l\u00e9phonique par d\u00e9faut : [ +243  \u25bc ]",
  "\u2502  Num\u00e9ro WhatsApp du pasteur  : [ +243 8xx xxx xxx ]",
  "\u2502  Activer les rappels auto      : [  \u2713  Oui  ]",
  "\u2502  Heure de rappel (si activ\u00e9) : [  21:00  ]",
  "\u2502  ",
  "\u2502  [  \u2713  SAUVEGARDER  ]",
]));

bodyChildren.push(h3("Actions d\u00e9taill\u00e9es"));
bodyChildren.push(bullet("Pour ajouter un espace : tap sur \u00ab + Ajouter un espace \u00bb, saisir le nom (ex : \u00ab Porte principale \u00bb, \u00ab Salle enfant \u00bb), valider."));
bodyChildren.push(bullet("Pour modifier un espace : tap sur l\u2019ic\u00f4ne crayon. Le nom peut \u00eatre chang\u00e9. L\u2019historique de comptage est conserv\u00e9."));
bodyChildren.push(bullet("Pour supprimer un espace : tap sur l\u2019ic\u00f4ne croix. Une confirmation est demand\u00e9e : \u00ab \u00cates-vous s\u00fbr ? L\u2019espace et tout son historique seront supprim\u00e9s. \u00bb"));
bodyChildren.push(bullet("Les modifications sont visibles par tous les agents imm\u00e9diatement (actualisation automatique)."));
bodyChildren.push(bullet("Le rappel automatique envoie un message WhatsApp au chef de protocole \u00e0 l\u2019heure configur\u00e9e si un rapport est encore en attente."));

// ══════════════════════════════════════════════════════════════════
// SECTION 4 : TEXTES EXACTS DES INFO-BULLES
// ══════════════════════════════════════════════════════════════════
bodyChildren.push(h1("4. Textes exacts des info-bulles du dashboard pasteur"));
bodyChildren.push(body("Les info-bulles sont les petites fen\u00eatres qui s\u2019affichent quand le pasteur tape sur le bouton \u00ab i \u00bb \u00e0 c\u00f4t\u00e9 de chaque KPI. Elles sont r\u00e9dig\u00e9es en fran\u00e7ais simple, sans jargon technique. Le but est que le pasteur comprenne exactement ce que le chiffre veut dire et comment il a \u00e9t\u00e9 calcul\u00e9."));

bodyChildren.push(h2("4.1 Assistance totale"));

bodyChildren.push(...screenBox("INFO-BULLE : ASSISTANCE TOTALE", [
  "\u2502  ",
  "\u2502  \u00ab Assistance totale \u00bb",
  "\u2502  ",
  "\u2502  C\u2019est le nombre total de personnes compt\u00e9es",
  "\u2502  aux entr\u00e9es pendant les cultes de la p\u00e9riode",
  "\u2502  s\u00e9lectionn\u00e9e (jour, semaine ou mois).",
  "\u2502  ",
  "\u2502  Ce chiffre vient de l\u2019addition de tous les",
  "\u2502  comptages effectu\u00e9s par les agents \u00e0 chaque porte",
  "\u2502  de l\u2019\u00e9glise pendant les cultes.",
  "\u2502  ",
  "\u2502  La fl\u00e8che montre si l\u2019assistance a augment\u00e9",
  "\u2502  ou diminu\u00e9 par rapport \u00e0 la p\u00e9riode pr\u00e9c\u00e9dente",
  "\u2502  (m\u00eame type de p\u00e9riode : semaine vs semaine,",
  "\u2502  mois vs mois).",
  "\u2502  ",
]));

bodyChildren.push(h2("4.2 Nouveaux venus"));

bodyChildren.push(...screenBox("INFO-BULLE : NOUVEAUX VENUS", [
  "\u2502  ",
  "\u2502  \u00ab Nouveaux venus \u00bb",
  "\u2502  ",
  "\u2502  C\u2019est le nombre de personnes qui visitent",
  "\u2502  l\u2019\u00e9glise pour la premi\u00e8re fois pendant la p\u00e9riode.",
  "\u2502  ",
  "\u2502  Ce chiffre est saisi par les agents d\u2019accueil",
  "\u2502  du d\u00e9partement Protocole. Chaque nouveau venu",
  "\u2502  est compt\u00e9 une seule fois.",
  "\u2502  ",
  "\u2502  Le d\u00e9partement \u00c9vang\u00e9lisation re\u00e7oit les",
  "\u2502  coordonn\u00e9es de chaque nouveau venu pour le suivi.",
  "\u2502  ",
  "\u2502  La fl\u00e8che montre l\u2019\u00e9volution par rapport \u00e0 la",
  "\u2502  p\u00e9riode pr\u00e9c\u00e9dente de m\u00eame dur\u00e9e.",
  "\u2502  ",
]));

bodyChildren.push(h2("4.3 Taux de retour"));

bodyChildren.push(...screenBox("INFO-BULLE : TAUX DE RETOUR", [
  "\u2502  ",
  "\u2502  \u00ab Taux de retour \u00bb",
  "\u2502  ",
  "\u2502  C\u2019est le pourcentage de nouveaux venus qui sont",
  "\u2502  revenus \u00e0 l\u2019\u00e9glise au moins une fois apr\u00e8s leur",
  "\u2502  premi\u00e8re visite.",
  "\u2502  ",
  "\u2502  Calcul : (Nouveaux venus revenus \u00f7 Total",
  "\u2502  nouveaux venus de la p\u00e9riode) \u00d7 100.",
  "\u2502  ",
  "\u2502  Exemple : si 38 personnes ont visit\u00e9 et que",
  "\u2502  16 d\u2019entre elles sont revenues, le taux est 42%.",
  "\u2502  ",
  "\u2502  Un taux \u00e9lev\u00e9 signifie que les nouveaux venus",
  "\u2502  sont bien accueillis et suivis. Un taux bas peut",
  "\u2502  indiquer un probl\u00e8me dans l\u2019accueil ou le suivi.",
  "\u2502  ",
  "\u2502  La p\u00e9riode de mesure est de 4 semaines apr\u00e8s",
  "\u2502  la premi\u00e8re visite pour d\u00e9terminer le retour.",
  "\u2502  ",
]));

bodyChildren.push(h2("4.4 Par culte"));

bodyChildren.push(...screenBox("INFO-BULLE : PAR CULTE", [
  "\u2502  ",
  "\u2502  \u00ab Par culte \u00bb",
  "\u2502  ",
  "\u2502  Cette carte montre le d\u00e9tail de l\u2019assistance",
  "\u2502  pour chaque culte de la p\u00e9riode.",
  "\u2502  ",
  "\u2502  En tapant \u00ab Voir d\u00e9tails \u00bb, vous acc\u00e9dez \u00e0 :",
  "\u2502  - Le nombre total par culte",
  "\u2502  - La r\u00e9partition hommes / femmes / enfants",
  "\u2502  - Le nombre de nouveaux venus par culte",
  "\u2502  - Les observations et incidents signal\u00e9s",
  "\u2502  - Le nom de l\u2019agent qui a fait le rapport",
  "\u2502  ",
  "\u2502  Cela permet de voir quel culte attire le plus",
  "\u2502  de monde et si certains cultes sont en baisse.",
  "\u2502  ",
]));

bodyChildren.push(h2("4.5 Performance \u00e9quipe"));

bodyChildren.push(...screenBox("INFO-BULLE : PERFORMANCE \u00c9QUIPE", [
  "\u2502  ",
  "\u2502  \u00ab Performance \u00e9quipe \u00bb",
  "\u2502  ",
  "\u2502  Cette carte montre si les agents du d\u00e9partement",
  "\u2502  Protocole ont bien fait leur travail.",
  "\u2502  ",
  "\u2502  Le nombre de rapports soumis est compar\u00e9 au",
  "\u2502  nombre de cultes qui avaient lieu. Si 5 cultes",
  "\u2502  ont eu lieu et que 5 rapports ont \u00e9t\u00e9 soumis,",
  "\u2502  le taux est de 100%.",
  "\u2502  ",
  "\u2502  Chaque agent est list\u00e9 avec son nombre de",
  "\u2502  rapports. Cela permet d\u2019identifier les agents",
  "\u2502  r\u00e9guliers et ceux qui ont besoin d\u2019un rappel.",
  "\u2502  ",
  "\u2502  Le chef de protocole re\u00e7oit automatiquement",
  "\u2502  un rappel si un rapport est manquant apr\u00e8s",
  "\u2502  chaque culte.",
  "\u2502  ",
]));

// ══════════════════════════════════════════════════════════════════
// SECTION 5 : SIMULATION DE TEST EN TEMPS R\u00c9EL
// ══════════════════════════════════════════════════════════════════
bodyChildren.push(h1("5. Simulation de test en temps r\u00e9el"));
bodyChildren.push(body("Cette section simule l\u2019utilisation de l\u2019application dans deux sc\u00e9narios r\u00e9els. Le but est de v\u00e9rifier que le parcours est fluide, sans blocage, et que chaque \u00e9tape est logique pour l\u2019utilisateur."));

bodyChildren.push(h2("5.1 Sc\u00e9nario agent : dimanche matin"));
bodyChildren.push(body("Nous suivons Marie, agent d\u2019accueil, un dimanche matin typique. Marie a un t\u00e9l\u00e9phone Android avec Chrome. L\u2019application est install\u00e9e sur son \u00e9cran d\u2019accueil."));

bodyChildren.push(h3("\u00c9tape 1 : Arriv\u00e9e \u00e0 l\u2019\u00e9glise (8h00)"));
bodyChildren.push(body("Marie ouvre l\u2019application en tapant sur l\u2019ic\u00f4ne \u00ab La Conqu\u00eate \u00bb. Elle voit l\u2019\u00e9cran d\u2019accueil avec son nom et les trois boutons. L\u2019indicateur montre \u00ab En ligne \u00bb (le Wi-Fi de l\u2019\u00e9glise est actif). Elle tape sur \u00ab Compter les entr\u00e9es \u00bb."));
bodyChildren.push(bodyBold("R\u00e9sultat attendu : ", "L\u2019\u00e9cran de comptage s\u2019ouvre en moins de 1 seconde. Les espaces configur\u00e9s par le chef (balcon, c\u00f4t\u00e9 gauche, c\u00f4t\u00e9 droit, rang\u00e9e A, rang\u00e9e B) sont affich\u00e9s. Tous les compteurs sont \u00e0 0."));

bodyChildren.push(h3("\u00c9tape 2 : D\u00e9but du culte (9h00)"));
bodyChildren.push(body("Les fid\u00e8les commencent \u00e0 entrer. Marie est \u00e0 la porte principale. \u00c0 chaque personne qui entre, elle tape sur \u00ab + \u00bb de l\u2019espace \u00ab C\u00f4t\u00e9 gauche \u00bb. Un groupe de 12 personnes arrive : elle fait un appui long sur \u00ab + \u00bb et tape \u00ab 12 \u00bb."));
bodyChildren.push(bodyBold("R\u00e9sultat attendu : ", "Chaque tap ajoute 1 au compteur et le total g\u00e9n\u00e9ral se met \u00e0 jour. L\u2019appui long ouvre un clavier num\u00e9rique. Apr\u00e8s validation, 12 est ajout\u00e9 d\u2019un coup."));

bodyChildren.push(h3("\u00c9tape 3 : Nouveau venu (9h30)"));
bodyChildren.push(body("Une femme arrive pour la premi\u00e8re fois. Marie tape sur le bouton \u00ab Retour \u00bb en bas, puis sur \u00ab Nouveaux venus \u00bb. Elle saisit le nom, le t\u00e9l\u00e9phone et le quartier. Elle tape sur \u00ab Enregistrer \u00bb, puis sur \u00ab Ajouter un autre \u00bb car deux autres nouveaux venus sont l\u00e0. Elle saisit les deux autres, puis revient au comptage."));
bodyChildren.push(bodyBold("R\u00e9sultat attendu : ", "Les donn\u00e9es sont enregistr\u00e9es. Le bouton \u00ab Ajouter un autre \u00bb r\u00e9initialise le formulaire sans perdre le contexte du culte. Le retour au comptage est instantan\u00e9 et les chiffres sont toujours l\u00e0."));

bodyChildren.push(h3("\u00c9tape 4 : Fin du comptage (9h45)"));
bodyChildren.push(body("Les portes sont ferm\u00e9es. Marie tape sur \u00ab Terminer et sauvegarder \u00bb. Un r\u00e9sum\u00e9 s\u2019affiche : \u00ab Balcon: 34, C\u00f4t\u00e9 gauche: 45, C\u00f4t\u00e9 droit: 28, Rang\u00e9e A: 12, Rang\u00e9e B: 8. Total: 127 \u00bb. Elle confirme."));
bodyChildren.push(bodyBold("R\u00e9sultat attendu : ", "Le syst\u00e8me propose de passer au rapport de culte. Le total 127 est pr\u00e9-rempli dans le formulaire de rapport."));

bodyChildren.push(h3("\u00c9tape 5 : Rapport apr\u00e8s le culte (12h00)"));
bodyChildren.push(body("Apr\u00e8s le culte, Marie ouvre l\u2019application et voit un rappel : \u00ab Vous n\u2019avez pas encore soumis le rapport du culte de ce matin \u00bb. Elle tape dessus, le formulaire de rapport s\u2019ouvre avec le total pr\u00e9-rempli. Elle ajoute la r\u00e9partition (hommes, femmes, enfants) et le nombre de nouveaux venus. Elle tape sur \u00ab Soumettre le rapport \u00bb."));
bodyChildren.push(bodyBold("R\u00e9sultat attendu : ", "Message de confirmation \u00ab Rapport envoy\u00e9 avec succ\u00e8s \u00bb. Le chef de protocole re\u00e7oit une notification. Le pasteur verra les chiffres dans son dashboard."));

bodyChildren.push(h3("Points o\u00f9 l\u2019agent pourrait bloquer"));
bodyChildren.push(makeTable(
  ["Situation", "Risque de blocage", "Solution pr\u00e9vue"],
  [
    ["Wi-Fi coup\u00e9 dans l'\u00e9glise", "L'agent pense que rien n'est sauvegard\u00e9", "Mode hors-ligne automatique : indicateur visible \u00ab Hors-ligne \u2014 donn\u00e9es sauvegard\u00e9es localement \u00bb. Synchronisation automatique au retour du Wi-Fi."],
    ["Appui long par erreur", "L'agent ouvre le clavier alors qu'il voulait juste +1", "Le clavier s'ouvre mais l'agent peut annuler en tapant en dehors. Le compteur n'est pas modifi\u00e9 tant que le chiffre n'est pas valid\u00e9."],
    ["Deux nouveaux venus en m\u00eame temps", "L'agent perd le fil entre les deux saisies", "Bouton \u00ab Ajouter un autre \u00bb garde le contexte. Le compteur de nouveaux venus s'incr\u00e9mente automatiquement."],
    ["Batterie faible", "L'agent ne peut plus compter", "Le comptage est sauvegard\u00e9 automatiquement toutes les 30 secondes. Si le t\u00e9l\u00e9phone s'\u00e9teint, les donn\u00e9es sont retrouv\u00e9es \u00e0 la r\u00e9ouverture."],
    ["L'agent oublie de soumettre le rapport", "Le pasteur n'a pas les chiffres", "Rappel automatique 2 heures apr\u00e8s la fin pr\u00e9vue du culte. Le chef de protocole voit les rapports manquants dans son dashboard."],
    ["L'agent quitte l'app par erreur", "Il craint d'avoir perdu ses donn\u00e9es", "Auto-sauvegarde continue. \u00c0 la r\u00e9ouverture, un message \u00ab Reprendre le comptage en cours ? \u00bb s'affiche."],
  ]
));

// ── 5.2 Sc\u00e9nario pasteur : lundi matin ──
bodyChildren.push(h2("5.2 Sc\u00e9nario pasteur : lundi matin"));
bodyChildren.push(body("Nous suivons le pasteur, le lundi matin \u00e0 8h30. Il veut voir les r\u00e9sultats du week-end."));

bodyChildren.push(h3("\u00c9tape 1 : Ouverture du dashboard"));
bodyChildren.push(body("Le pasteur ouvre l\u2019application. Il arrive directement sur le dashboard (pas de navigation \u00e0 faire). La vue \u00ab Semaine \u00bb est affich\u00e9e par d\u00e9faut. Il voit les 4 cartes avec les KPIs du week-end."));

bodyChildren.push(h3("\u00c9tape 2 : Lecture rapide (30 secondes)"));
bodyChildren.push(body("Il lit : Assistance 1 247 (\u2191 +12%). Nouveaux venus 38 (\u2193 -5%). Taux de retour 42% (\u2191 +3 pts). Il tape sur le \u00ab i \u00bb \u00e0 c\u00f4t\u00e9 de \u00ab Taux de retour \u00bb pour comprendre le chiffre. La fen\u00eatre s\u2019affiche, il lit l\u2019explication, il tape n\u2019importe o\u00f9 pour fermer."));
bodyChildren.push(bodyBold("R\u00e9sultat attendu : ", "En 30 secondes, le pasteur a une vue compl\u00e8te de la sant\u00e9 de l\u2019\u00e9glise pour le week-end. Il sait que l\u2019assistance monte mais que les nouveaux venus baissent l\u00e9g\u00e8rement."));

bodyChildren.push(h3("\u00c9tape 3 : Voir les d\u00e9tails par culte"));
bodyChildren.push(body("Le pasteur tape sur la carte \u00ab Par culte \u00bb. Il voit un tableau : Dimanche matin 347 personnes, Dimanche soir 189, Mercredi (si dans la p\u00e9riode) 210. Il tape sur \u00ab Dimanche matin \u00bb pour voir le d\u00e9tail : 42 hommes, 58 femmes, 27 enfants, 8 nouveaux venus, pas d\u2019incidents."));
bodyChildren.push(bodyBold("R\u00e9sultat attendu : ", "Navigation fluide du r\u00e9sum\u00e9 au d\u00e9tail. Le pasteur peut remonter avec le bouton \u00ab Retour \u00bb."));

bodyChildren.push(h3("\u00c9tape 4 : Export PDF"));
bodyChildren.push(body("Le pasteur tape sur \u00ab T\u00e9l\u00e9charger PDF \u00bb. Le PDF est g\u00e9n\u00e9r\u00e9 instantan\u00e9ment avec le logo de l\u2019\u00e9glise, l\u2019en-t\u00eate, les KPIs et le d\u00e9tail par culte. Il peut ensuite le partager ou l\u2019imprimer."));
bodyChildren.push(bodyBold("R\u00e9sultat attendu : ", "Le PDF est un document professionnel, pr\u00eat \u00e0 \u00eatre partag\u00e9 avec les autres pasteurs ou imprim\u00e9 pour les r\u00e9unions de direction."));

bodyChildren.push(h3("\u00c9tape 5 : Partage par WhatsApp"));
bodyChildren.push(body("Le pasteur tape sur \u00ab Envoyer par WhatsApp \u00bb. WhatsApp s\u2019ouvre avec le PDF en pi\u00e8ce jointe et le message pr\u00e9-rempli : \u00ab Rapport hebdomadaire \u2014 \u00c9glise \u00c9vang\u00e9lique La Conqu\u00eate \u00bb. Il choisit le destinataire (ou le groupe) et envoie."));
bodyChildren.push(bodyBold("R\u00e9sultat attendu : ", "Le PDF est envoy\u00e9 en 2 taps. Le pasteur n\u2019a pas \u00e0 chercher le fichier, \u00e0 ouvrir WhatsApp manuellement ou \u00e0 taper un message."));

// ══════════════════════════════════════════════════════════════════
// SECTION 6 : PLAN D'ACTION CONCRET
// ══════════════════════════════════════════════════════════════════
bodyChildren.push(h1("6. Plan d\u2019action concret"));
bodyChildren.push(body("Ce plan d\u00e9taille les \u00e9tapes r\u00e9elles \u00e0 suivre, semaine par semaine, pour passer de z\u00e9ro \u00e0 un syst\u00e8me fonctionnel. Chaque \u00e9tape a un objectif clair et un r\u00e9sultat v\u00e9rifiable."));

bodyChildren.push(h2("6.1 Cette semaine : fondations"));

bodyChildren.push(h3("Jour 1-2 : Configuration de la base de donn\u00e9es"));
bodyChildren.push(bullet("Cr\u00e9er les tables Supabase pour le module Protocole : services (cultes), attendance_counts, service_reports, new_visitors, counting_spaces."));
bodyChildren.push(bullet("Configurer les politiques de s\u00e9curit\u00e9 (RLS) pour que les agents ne voient que leurs propres rapports et que le chef voit tout le d\u00e9partement."));
bodyChildren.push(bullet("Cr\u00e9er les r\u00f4les dans le syst\u00e8me existant : agent_protocole, chef_protocole, pasteur, secretaire."));
bodyChildren.push(bodyBold("R\u00e9sultat v\u00e9rifiable : ", "Les tables existent en base, les politiques RLS sont test\u00e9es avec des requ\u00eates directes."));

bodyChildren.push(h3("Jour 3-4 : \u00c9cran de comptage"));
bodyChildren.push(bullet("D\u00e9velopper l\u2019\u00e9cran de comptage avec les gros boutons +/\u2212 par espace."));
bodyChildren.push(bullet("Impl\u00e9menter le mode hors-ligne avec sauvegarde locale (IndexedDB ou localStorage)."));
bodyChildren.push(bullet("Cr\u00e9er la page de configuration des espaces (ajout/suppression)."));
bodyChildren.push(bodyBold("R\u00e9sultat v\u00e9rifiable : ", "Un agent peut compter des entr\u00e9es, les chiffres sont m\u00e9moris\u00e9s m\u00eame apr\u00e8s fermeture de l\u2019application."));

bodyChildren.push(h3("Jour 5-6 : Formulaire de rapport et nouveaux venus"));
bodyChildren.push(bullet("Cr\u00e9er le formulaire de rapport de culte (hommes, femmes, enfants, incidents)."));
bodyChildren.push(bullet("Cr\u00e9er le formulaire rapide de nouveau venu avec d\u00e9tection de doublon."));
bodyChildren.push(bullet("Connecter les formulaires \u00e0 la base de donn\u00e9es Supabase."));
bodyChildren.push(bodyBold("R\u00e9sultat v\u00e9rifiable : ", "Un agent peut faire le cycle complet : compter, saisir les nouveaux venus, remplir le rapport, soumettre."));

bodyChildren.push(h3("Jour 7 : Tests internes"));
bodyChildren.push(bullet("Tester le parcours complet agent sur un vrai t\u00e9l\u00e9phone Android."));
bodyChildren.push(bullet("Tester le mode hors-ligne : couper le Wi-Fi, compter, remettre le Wi-Fi, v\u00e9rifier la synchronisation."));
bodyChildren.push(bullet("Corriger les bugs trouv\u00e9s."));
bodyChildren.push(bodyBold("R\u00e9sultat v\u00e9rifiable : ", "Le parcours agent fonctionne de bout en bout sur un t\u00e9l\u00e9phone Android."));

bodyChildren.push(h2("6.2 Ce mois : d\u00e9ploiement et formation"));

bodyChildren.push(h3("Semaine 2 : Dashboard chef de protocole"));
bodyChildren.push(bullet("D\u00e9velopper le dashboard chef de protocole : liste des cultes, validation des rapports, assignation des agents."));
bodyChildren.push(bullet("Impl\u00e9menter le rappel WhatsApp pour les rapports manquants."));
bodyChildren.push(bullet("Cr\u00e9er la vue de performance de l\u2019\u00e9quipe."));
bodyChildren.push(bodyBold("R\u00e9sultat v\u00e9rifiable : ", "Le chef de protocole peut valider des rapports, voir la performance de l\u2019\u00e9quipe et envoyer des rappels."));

bodyChildren.push(h3("Semaine 3 : Dashboard pasteur + PDF"));
bodyChildren.push(bullet("D\u00e9velopper le dashboard pasteur avec les 4 KPIs et les info-bulles."));
bodyChildren.push(bullet("Impl\u00e9menter le toggle jour/semaine/mois."));
bodyChildren.push(bullet("Cr\u00e9er la g\u00e9n\u00e9ration PDF avec en-t\u00eate \u00e9glise (logo, nom, date)."));
bodyChildren.push(bullet("Impl\u00e9menter l\u2019envoi WhatsApp automatique avec le PDF en pi\u00e8ce jointe."));
bodyChildren.push(bodyBold("R\u00e9sultat v\u00e9rifiable : ", "Le pasteur peut voir les statistiques et exporter un PDF professionnel en un tap."));

bodyChildren.push(h3("Semaine 4 : Formation et lancement"));
bodyChildren.push(bullet("Organiser une s\u00e9ance de formation de 30 minutes avec les agents du d\u00e9partement Protocole."));
bodyChildren.push(bullet("Installer l\u2019application sur les t\u00e9l\u00e9phones de chaque agent (ajouter \u00e0 l\u2019\u00e9cran d\u2019accueil)."));
bodyChildren.push(bullet("Cr\u00e9er les comptes pour chaque agent."));
bodyChildren.push(bullet("Faire un test en conditions r\u00e9elles pendant un culte (sans remplacer le syst\u00e8me actuel)."));
bodyChildren.push(bodyBold("R\u00e9sultat v\u00e9rifiable : ", "Tous les agents ont l\u2019application install\u00e9e et savent l\u2019utiliser. Un culte a \u00e9t\u00e9 test\u00e9 en parall\u00e8le."));

bodyChildren.push(h2("6.3 Ce trimestre : consolidation et am\u00e9lioration"));

bodyChildren.push(h3("Mois 2 : Optimisation"));
bodyChildren.push(bullet("Analyser les retours des agents et du pasteur apr\u00e8s 4 semaines d\u2019utilisation r\u00e9elle."));
bodyChildren.push(bullet("Ajouter les comparatifs entre agents (si deux agents comptent le m\u00eame culte)."));
bodyChildren.push(bullet("Am\u00e9liorer le mode hors-ligne en fonction des probl\u00e8mes rencontr\u00e9s."));
bodyChildren.push(bullet("Ajouter des graphiques d\u2019\u00e9volution dans le dashboard pasteur (courbe d\u2019assistance sur 4 semaines, 3 mois, 6 mois)."));
bodyChildren.push(bodyBold("R\u00e9sultat v\u00e9rifiable : ", "Les retours sont collect\u00e9s, les am\u00e9liorations prioritaires sont identifi\u00e9es et d\u00e9ploy\u00e9es."));

bodyChildren.push(h3("Mois 3 : Extension aux autres d\u00e9partements"));
bodyChildren.push(bullet("Adapter le module pour le d\u00e9partement \u00c9conomie (suivi des offrandes, d\u00e9penses, rapport financier)."));
bodyChildren.push(bullet("Adapter le module pour le d\u00e9partement \u00c9vang\u00e9lisation (suivi des nouveaux venus, visites, formation)."));
bodyChildren.push(bullet("Cr\u00e9er un dashboard global pour le pasteur qui regroupe les statistiques de tous les d\u00e9partements."));
bodyChildren.push(bullet("Documenter les proc\u00e9dures pour que le chef de chaque d\u00e9partement puisse former son \u00e9quipe."));
bodyChildren.push(bodyBold("R\u00e9sultat v\u00e9rifiable : ", "Les trois d\u00e9partements (Protocole, \u00c9conomie, \u00c9vang\u00e9lisation) utilisent le syst\u00e8me. Le pasteur a une vue consolid\u00e9e."));

// ══════════════════════════════════════════════════════════════════
// SECTION 7 : FRICTIONS ANTICIP\u00c9ES + PARADE
// ══════════════════════════════════════════════════════════════════
bodyChildren.push(h1("7. Frictions anticip\u00e9es et parades"));
bodyChildren.push(body("Cette section identifie les probl\u00e8mes concrets qui pourraient survenir lors de l\u2019utilisation r\u00e9elle de l\u2019application, et pour chacun, propose une solution d\u00e9j\u00e0 int\u00e9gr\u00e9e dans le design."));

bodyChildren.push(h2("7.1 Mode hors-ligne"));

bodyChildren.push(h3("Probl\u00e8me"));
bodyChildren.push(body("Le Wi-Fi de l\u2019\u00e9glise peut \u00eatre instable ou coup\u00e9 pendant le culte. L\u2019agent a commenc\u00e9 \u00e0 compter mais ne peut plus sauvegarder. Il craint de perdre ses donn\u00e9es."));

bodyChildren.push(h3("Parade"));
bodyChildren.push(bullet("Le Service Worker de la PWA met en cache toute l\u2019application. L\u2019agent peut continuer \u00e0 compter m\u00eame sans connexion."));
bodyChildren.push(bullet("Un indicateur clair \u00ab \u25cb Hors-ligne \u2014 Sauvegarde locale active \u00bb est affich\u00e9 en permanence quand la connexion est perdue."));
bodyChildren.push(bullet("Les donn\u00e9es sont sauvegard\u00e9es localement (IndexedDB) toutes les 30 secondes ET \u00e0 chaque action (+1, \u22121, soumission)."));
bodyChildren.push(bullet("D\u00e8s que la connexion revient, la synchronisation est automatique. Un indicateur \u00ab Synchronisation en cours... \u00bb puis \u00ab Tout est \u00e0 jour \u00bb s\u2019affiche."));
bodyChildren.push(bullet("Si le t\u00e9l\u00e9phone s\u2019\u00e9teint, les donn\u00e9es sont retrouv\u00e9es \u00e0 la r\u00e9ouverture de l\u2019application."));

bodyChildren.push(h2("7.2 Notifications et rappels"));

bodyChildren.push(h3("Probl\u00e8me"));
bodyChildren.push(body("L\u2019agent oublie de soumettre son rapport apr\u00e8s le culte. Le chef de protocole ne le sait pas. Le pasteur n\u2019a pas les chiffres le lundi matin."));

bodyChildren.push(h3("Parade"));
bodyChildren.push(bullet("Deux heures apr\u00e8s la fin pr\u00e9vue du culte, l\u2019agent re\u00e7oit une notification push : \u00ab N\u2019oubliez pas de soumettre le rapport du culte d\u2019aujourd\u2019hui \u00bb."));
bodyChildren.push(bullet("Le chef de protocole voit dans son dashboard les rapports en attente. Si un rapport est manquant apr\u00e8s 4 heures, il re\u00e7oit aussi une notification."));
bodyChildren.push(bullet("Le bouton \u00ab Rappeler \u00bb dans le dashboard chef ouvre WhatsApp avec un message pr\u00e9-rempli."));
bodyChildren.push(bullet("Le lundi matin, si des rapports manquent toujours, le chef re\u00e7oit un r\u00e9sum\u00e9 : \u00ab 2 rapports manquants pour le week-end \u00bb."));

bodyChildren.push(h2("7.3 Anti-doublon des nouveaux venus"));

bodyChildren.push(h3("Probl\u00e8me"));
bodyChildren.push(body("Un nouveau venu est enregistr\u00e9 deux fois : une fois le dimanche matin par un agent, et une fois le dimanche soir par un autre agent qui ne savait pas qu\u2019il avait d\u00e9j\u00e0 \u00e9t\u00e9 enregistr\u00e9."));

bodyChildren.push(h3("Parade"));
bodyChildren.push(bullet("Quand l\u2019agent saisit un nom et un num\u00e9ro de t\u00e9l\u00e9phone, le syst\u00e8me v\u00e9rifie automatiquement s\u2019il existe un doublon dans les 30 derniers jours."));
bodyChildren.push(bullet("Si un doublon est d\u00e9tect\u00e9, un message clair s\u2019affiche : \u00ab Cette personne a d\u00e9j\u00e0 \u00e9t\u00e9 enregistr\u00e9e le 6 juillet 2026. Voulez-vous quand m\u00eame l\u2019ajouter ? \u00bb avec les boutons \u00ab Oui, ajouter \u00bb et \u00ab Non, annuler \u00bb."));
bodyChildren.push(bullet("Le chef de protocole peut voir les doublons potentiels dans un rapport sp\u00e9cial et les fusionner manuellement si n\u00e9cessaire."));
bodyChildren.push(bullet("Le d\u00e9partement \u00c9vang\u00e9lisation ne re\u00e7oit les informations que si le visiteur est confirm\u00e9 comme nouveau (pas un doublon)."));

bodyChildren.push(h2("7.4 Connexion lente"));

bodyChildren.push(h3("Probl\u00e8me"));
bodyChildren.push(body("L\u2019agent a la 4G mais la connexion est tr\u00e8s lente. L\u2019application met du temps \u00e0 charger. L\u2019agent perd patience et veut revenir au papier."));

bodyChildren.push(h3("Parade"));
bodyChildren.push(bullet("L\u2019application est une PWA : apr\u00e8s la premi\u00e8re visite, tout est mis en cache localement. Les chargements suivants sont quasi instantan\u00e9s."));
bodyChildren.push(bullet("Le comptage fonctionne enti\u00e8rement en local. Aucune requ\u00eate r\u00e9seau n\u2019est n\u00e9cessaire pour les +1/\u22121."));
bodyChildren.push(bullet("Un \u00e9cran de chargement avec un indicateur visuel est affich\u00e9 si l\u2019initialisation prend plus de 2 secondes."));
bodyChildren.push(bullet("Le Service Worker pr\u00e9charge les donn\u00e9es n\u00e9cessaires (espaces de comptage, dernier rapport) en arri\u00e8re-plan."));

bodyChildren.push(h2("7.5 Oubli de soumission du rapport"));

bodyChildren.push(h3("Probl\u00e8me"));
bodyChildren.push(body("L\u2019agent a compt\u00e9 mais n\u2019a pas rempli le rapport d\u00e9taill\u00e9 (hommes, femmes, enfants). Il pensait que le comptage suffisait."));

bodyChildren.push(h3("Parade"));
bodyChildren.push(bullet("Apr\u00e8s le comptage, le syst\u00e8me affiche automatiquement le rapport avec les chiffres pr\u00e9-remplis. L\u2019agent n\u2019a qu\u2019\u00e0 ajouter la r\u00e9partition."));
bodyChildren.push(bullet("Si l\u2019agent ferme l\u2019application sans soumettre, un rappel appara\u00eet \u00e0 la prochaine ouverture : \u00ab Vous avez un rapport en cours pour le culte du [date]. Voulez-vous le compl\u00e9ter ? \u00bb"));
bodyChildren.push(bullet("Le chef de protocole peut remplir le rapport \u00e0 la place de l\u2019agent si n\u00e9cessaire (il a les droits de modification)."));
bodyChildren.push(bullet("La case \u00ab Hommes / Femmes / Enfants \u00bb est optionnelle. Si l\u2019agent n\u2019a que le total, il peut soumettre avec le total seul."));

bodyChildren.push(h2("7.6 Changement de t\u00e9l\u00e9phone"));

bodyChildren.push(h3("Probl\u00e8me"));
bodyChildren.push(body("Un agent change de t\u00e9l\u00e9phone. Ses donn\u00e9es locales (comptage en cours) sont perdues."));

bodyChildren.push(h3("Parade"));
bodyChildren.push(bullet("Les donn\u00e9es sont synchronis\u00e9es sur Supabase d\u00e8s que la connexion est disponible. Un changement de t\u00e9l\u00e9phone ne perd que les donn\u00e9es non synchronis\u00e9es."));
bodyChildren.push(bullet("Sur le nouveau t\u00e9l\u00e9phone, l\u2019agent se connecte avec son compte et retrouve tout son historique."));
bodyChildren.push(bullet("Si un comptage \u00e9tait en cours et non synchronis\u00e9, l\u2019agent peut recr\u00e9er un rapport manuel dans son dashboard."));

bodyChildren.push(h2("7.7 Saisie erron\u00e9e"));

bodyChildren.push(h3("Probl\u00e8me"));
bodyChildren.push(body("L\u2019agent tape \u00ab + \u00bb trop de fois par erreur. Le chiffre est fauss\u00e9."));

bodyChildren.push(h3("Parade"));
bodyChildren.push(bullet("Le bouton \u00ab \u2212 \u00bb est toujours disponible pour corriger imm\u00e9diatement."));
bodyChildren.push(bullet("Apr\u00e8s la soumission du rapport, le chef de protocole peut modifier les chiffres avant validation. C\u2019est un contr\u00f4le de qualit\u00e9 int\u00e9gr\u00e9."));
bodyChildren.push(bullet("Si le chef valide par erreur, il peut annuler la validation dans les 24 heures."));

bodyChildren.push(h2("7.8 Tableau r\u00e9capitulatif des frictions"));

bodyChildren.push(makeTable(
  ["Friction", "S\u00e9v\u00e9rit\u00e9", "Probabilit\u00e9", "Solution"],
  [
    ["Wi-Fi coup\u00e9", "\u00c9lev\u00e9e", "Forte", "Mode hors-ligne complet"],
    ["Oubli de rapport", "\u00c9lev\u00e9e", "Forte", "Rappels automatiques + workflow for\u00e7\u00e9"],
    ["Saisie erron\u00e9e", "Moyenne", "Moyenne", "Bouton \u2212 + validation chef"],
    ["Doublon nouveau venu", "Moyenne", "Moyenne", "D\u00e9tection auto + confirmation"],
    ["Connexion lente", "Moyenne", "Moyenne", "PWA cache + comptage local"],
    ["Changement t\u00e9l\u00e9phone", "Faible", "Faible", "Sync cloud + connexion compte"],
    ["Agent non form\u00e9", "\u00c9lev\u00e9e", "Moyenne", "Formation 30 min + guide visuel"],
    ["Batterie faible", "Moyenne", "Moyenne", "Auto-sauvegarde toutes les 30s"],
  ]
));

bodyChildren.push(note("R\u00e8gle d\u2019or : toute friction identifi\u00e9e apr\u00e8s le lancement sera ajout\u00e9e \u00e0 ce tableau et corrig\u00e9e dans la mise \u00e0 jour suivante. Le feedback des utilisateurs est la priorit\u00e9 num\u00e9ro 1."));

// ══════════════════════════════════════════════════════════════════
// BODY SECTION (footer with page numbers)
// ══════════════════════════════════════════════════════════════════
const bodySection = {
  properties: {
    page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 } }
  },
  headers: {
    default: new Header({
      children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: "Guide Protocole \u2014 La Conqu\u00eate", size: 18, font: "Calibri", color: c(P.secondary), italics: true })]
      })]
    })
  },
  footers: {
    default: new Footer({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Page ", size: 18, font: "Calibri", color: c(P.secondary) }),
          new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Calibri", color: c(P.secondary) }),
        ]
      })]
    })
  },
  children: bodyChildren
};

// ══════════════════════════════════════════════════════════════════
// ASSEMBLE DOCUMENT
// ══════════════════════════════════════════════════════════════════
const doc = new Document({
  creator: "Super Z (Consultant Technique)",
  title: "Guide de Conception \u2014 Application Protocole/Accueil",
  description: "Document de consultation pour l'application de gestion du d\u00e9partement Protocole/Accueil de l'\u00c9glise \u00c9vang\u00e9lique La Conqu\u00eate",
  styles: {
    default: {
      document: {
        run: { size: 24, font: "Calibri", color: c(P.body) },
        paragraph: { spacing: { line: 312 } }
      },
      heading1: { run: { size: 32, bold: true, font: "Times New Roman", color: c(P.primary) } },
      heading2: { run: { size: 28, bold: true, font: "Times New Roman", color: c(P.primary) } },
      heading3: { run: { size: 26, bold: true, font: "Times New Roman", color: c(P.primary) } },
    }
  },
  sections: [coverSection, tocSection, bodySection]
});

// ── Write file ──
const OUTPUT = "/home/z/my-project/download/Guide_Application_Protocole.docx";
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(OUTPUT, buffer);
  console.log("Document generated:", OUTPUT);
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});