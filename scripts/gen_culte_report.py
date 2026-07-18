import os, hashlib, sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    Paragraph, Spacer, Table, TableStyle, PageBreak,
    KeepTogether, HRFlowable,
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.platypus import SimpleDocTemplate
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

FONT_DIR = '/usr/share/fonts'
pdfmetrics.registerFont(TTFont('NotoSerifSC', os.path.join(FONT_DIR, 'truetype', 'noto-serif-sc', 'NotoSerifSC-Regular.ttf')))
pdfmetrics.registerFont(TTFont('NotoSerifSC-Bold', os.path.join(FONT_DIR, 'truetype', 'noto-serif-sc', 'NotoSerifSC-Bold.ttf')))
pdfmetrics.registerFont(TTFont('NotoSansSC', os.path.join(FONT_DIR, 'truetype', 'noto-serif-sc', 'NotoSerifSC-Regular.ttf')))
pdfmetrics.registerFont(TTFont('NotoSansSC-Bold', os.path.join(FONT_DIR, 'truetype', 'noto-serif-sc', 'NotoSerifSC-Bold.ttf')))
pdfmetrics.registerFont(TTFont('Tinos', os.path.join(FONT_DIR, 'truetype', 'dejavu', 'DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('Tinos-Bold', os.path.join(FONT_DIR, 'truetype', 'dejavu', 'DejaVuSans-Bold.ttf')))
registerFontFamily('NotoSerifSC', normal='NotoSerifSC', bold='NotoSerifSC-Bold')
registerFontFamily('NotoSansSC', normal='NotoSansSC', bold='NotoSansSC-Bold')
registerFontFamily('Tinos', normal='Tinos', bold='Tinos-Bold')

PAGE_BG = colors.HexColor('#151412')
SECTION_BG = colors.HexColor('#1e1d1a')
CARD_BG = colors.HexColor('#2b2922')
TABLE_STRIPE = colors.HexColor('#201f1c')
HEADER_FILL = colors.HexColor('#57503c')
COVER_BLOCK = colors.HexColor('#3c372b')
BORDER = colors.HexColor('#5a523a')
ICON_C = colors.HexColor('#c5b689')
ACCENT = colors.HexColor('#dfc780')
ACCENT_2 = colors.HexColor('#43a9cb')
TEXT_PRIMARY = colors.HexColor('#e7e6e5')
TEXT_MUTED = colors.HexColor('#86837c')
SEM_SUCCESS = colors.HexColor('#7bc494')
SEM_WARNING = colors.HexColor('#b99e6a')
SEM_ERROR = colors.HexColor('#c47972')
SEM_INFO = colors.HexColor('#82a0be')

W, H = A4
LEFT_M = 25*mm
RIGHT_M = 20*mm
TOP_M = 25*mm
BOT_M = 25*mm
CONTENT_W = W - LEFT_M - RIGHT_M

ss = getSampleStyleSheet()
sTitle = ParagraphStyle('T', fontName='NotoSansSC-Bold', fontSize=22, leading=28, textColor=ACCENT, spaceAfter=6*mm, spaceBefore=8*mm)
sH2 = ParagraphStyle('H2', fontName='NotoSansSC-Bold', fontSize=16, leading=22, textColor=ACCENT, spaceAfter=4*mm, spaceBefore=6*mm)
sH3 = ParagraphStyle('H3', fontName='NotoSansSC-Bold', fontSize=13, leading=18, textColor=ICON_C, spaceAfter=3*mm, spaceBefore=4*mm)
sBody = ParagraphStyle('B', fontName='NotoSansSC', fontSize=10.5, leading=16, textColor=TEXT_PRIMARY, spaceAfter=3*mm, alignment=3)
sBullet = ParagraphStyle('BL', fontName='NotoSansSC', fontSize=10.5, leading=16, textColor=TEXT_PRIMARY, spaceAfter=1.5*mm, leftIndent=12*mm, bulletIndent=6*mm, bulletFontName='NotoSansSC', bulletFontSize=10.5)
sSubBullet = ParagraphStyle('SB', fontName='NotoSansSC', fontSize=10, leading=15, textColor=TEXT_MUTED, spaceAfter=1*mm, leftIndent=20*mm, bulletIndent=14*mm)
sTableHeader = ParagraphStyle('TH', fontName='NotoSansSC-Bold', fontSize=9.5, leading=13, textColor=colors.white, alignment=1)
sTableCell = ParagraphStyle('TC', fontName='NotoSansSC', fontSize=9, leading=13, textColor=TEXT_PRIMARY)
sCap = ParagraphStyle('Cap', fontName='NotoSansSC', fontSize=9, leading=13, textColor=TEXT_MUTED, spaceAfter=4*mm)
sFooter = ParagraphStyle('F', fontName='NotoSansSC', fontSize=8, textColor=TEXT_MUTED, alignment=1)
sToc0 = ParagraphStyle('T0', fontName='NotoSansSC-Bold', fontSize=12, leading=20, textColor=TEXT_PRIMARY, leftIndent=0)
sToc1 = ParagraphStyle('T1', fontName='NotoSansSC', fontSize=10.5, leading=18, textColor=TEXT_MUTED, leftIndent=8*mm)

def heading(text, style=sTitle, level=0):
    key = 'h_' + hashlib.md5(text.encode()).hexdigest()[:8]
    p = Paragraph(text, style)
    p.bookmark_name = key
    p.bookmark_level = level
    p.bookmark_text = text
    p.bookmark_key = key
    return p

def body(t):
    return Paragraph(t, sBody)

def bullet(t):
    return Paragraph('<bullet>&bull;</bullet> ' + t, sBullet)

def sub_bullet(t):
    return Paragraph('<bullet>-</bullet> ' + t, sSubBullet)

def hr():
    return HRFlowable(width='100%', thickness=0.5, color=BORDER, spaceBefore=3*mm, spaceAfter=3*mm)

def caption(t):
    return Paragraph(t, sCap)

def make_table(headers, rows, col_widths=None):
    cw = col_widths or [CONTENT_W / len(headers)] * len(headers)
    header_row = [Paragraph(h, sTableHeader) for h in headers]
    data = [header_row] + [[Paragraph(str(c), sTableCell) for c in row] for row in rows]
    t = Table(data, colWidths=cw, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_FILL),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'NotoSansSC-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9.5),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('TOPPADDING', (0, 0), (-1, 0), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
        ('TOPPADDING', (0, 1), (-1, -1), 5),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.Color(0,0,0,0), TABLE_STRIPE]),
    ]
    t.setStyle(TableStyle(style_cmds))
    return t

class TocDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'bookmark_name'):
            level = getattr(flowable, 'bookmark_level', 0)
            text = getattr(flowable, 'bookmark_text', '')
            key = getattr(flowable, 'bookmark_key', '')
            self.notify('TOCEntry', (level, text, self.page, key))

def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont('NotoSansSC', 8)
    canvas.setFillColor(TEXT_MUTED)
    canvas.drawCentredString(W / 2, 12*mm, str(doc.page))
    canvas.restoreState()

story = []

toc = TableOfContents()
toc.levelStyles = [sToc0, sToc1]
story.append(toc)
story.append(PageBreak())

# ═══ 1. OBJECTIF ═══
story.append(heading("1. Objectif de la fonctionnalite"))
story.append(body("Le systeme de planification du culte a pour but de centraliser et structurer toute la preparation des cultes de l'Eglise Evangelique La Conquete. Actuellement, la coordination entre le coordinateur du departement media, les orateurs et le president de culte se fait de maniere informelle par appels telephoniques ou messages WhatsApp disperses. Cela engendre des pertes d'informations, des retards dans la preparation des supports visuels et sonores, et une communication fragmentee entre les equipes techniques et pastorales. La fonctionnalite proposee transforme ce processus en un flux numerique fluide : un formulaire structure est genere automatiquement, envoye via WhatsApp a l'orateur ou au president de culte, puis rempli en ligne. Une fois soumis, le departement media et le pasteur principal disposent d'un tableau de bord complet leur permettant de preparer en amont la projection, le son, la prise de vue et la logistique du culte. L'objectif ultime est d'eliminer les allers-retours telephoniques, de reduire les erreurs de communication et de garantir que chaque culte soit prepare avec professionnalisme et rigueur."))
story.append(body("Le systeme s'integre nativement dans la PWA existante du media center, sans necessiter d'application externe. Il profite de l'infrastructure Supabase deja en place, du systeme d'authentification, des notifications push et du mode hors-ligne de la PWA. Le formulaire est accessible via un lien partageable, ce qui signifie que l'orateur n'a pas besoin d'un compte ni d'une installation speciale pour y repondre."))

# ═══ 2. FLUX ═══
story.append(heading("2. Flux de fonctionnement complet"))
story.append(body("Le workflow complet de la planification du culte se decompose en sept etapes distinctes, chacune etant geree par un acteur specifique du systeme. Ce flux a ete concu pour etre le plus intuitif possible, en minimisant les frictions et en s'appuyant sur les habitudes existantes de l'equipe, notamment l'utilisation de WhatsApp comme canal de communication principal."))

story.append(heading("2.1 Creation du culte par le coordinateur", level=1))
story.append(body("Le coordinateur du departement media (ou un membre autorise) se connecte au Media Center via la PWA. Dans le panneau de planification, il cree un nouveau culte en renseignant la date, l'heure et le type de culte (dimanche ordinaire, culte special, veille de priere, concert de louange, etc.). Le systeme genere automatiquement deux formulaires distincts : un formulaire pour l'orateur du culte et un formulaire pour le president de culte. Chaque formulaire recoit un identifiant unique (UUID) et un token de securite a usage unique, ce qui garantit que seul le destinataire designe peut y repondre."))

story.append(heading("2.2 Generation et envoi des liens WhatsApp", level=1))
story.append(body("Une fois le culte cree, le systeme genere deux liens publics (URLs signees). Le coordinateur peut envoyer ces liens manuellement via WhatsApp, ou utiliser le bouton d'envoi integre qui ouvre directement WhatsApp Web ou l'application mobile avec un message pre-rempli contenant le lien. Le message inclut le nom du culte, la date et une invitation polie. Le lien est de la forme : votre-site.com/form/orateur/TOKEN ou votre-site.com/form/president/TOKEN. Ce lien est accessible sans authentification, ce qui le rend utilisable par n'importe quel orateur invite, meme s'il n'a pas de compte sur la plateforme."))

story.append(heading("2.3 Remplissage du formulaire par l'orateur", level=1))
story.append(body("L'orateur clique sur le lien WhatsApp, qui s'ouvre dans le navigateur de son telephone (la PWA est detectee automatiquement). Il accede au formulaire structure qui lui est destine. Il remplit les champs obligatoires : son nom, le theme principal, le sous-theme, le verset biblique (via une liste deroulante interactive des 66 livres de la Bible avec autocomplete), les grands points de son message, et un resume. Les champs optionnels incluent les sous-points detailles et les remarques ou avis speciaux. Le formulaire est concu pour etre rempli en 5 a 10 minutes maximum, avec une sauvegarde automatique locale (localStorage) pour eviter toute perte de donnees en cas de coupure de connexion."))

story.append(heading("2.4 Remplissage du formulaire par le president", level=1))
story.append(body("Le president de culte accede a son propre formulaire via le lien qui lui est dedie. Son formulaire est centre sur l'ordre du culte : il choisit les etapes parmi une liste predefinie (louange, adoration, offrande, communion, prieres, temoignages, annonces, etc.) et les organise par glisser-deposer ou par des fleches haut/bas. Chaque etape peut recevoir une duree estimee et des notes optionnelles. Une fois l'ordre defini, le president soumet le formulaire. Le systeme enregistre la sequence exacte des etapes, ce qui permet au departement media de preparer les transitions visuelles et sonores avec precision."))

story.append(heading("2.5 Soumission et notification", level=1))
story.append(body("Des qu'un formulaire est soumis, les donnees sont enregistrees dans la base de donnees Supabase. Le systeme envoie automatiquement une notification push au coordinateur du media et au pasteur principal. Un statut visuel dans le tableau de bord passe de 'En attente' a 'Recu' puis a 'Complete' lorsque les deux formulaires sont remplis. Si un seul formulaire est soumis, le statut reste 'Partiel' pour alerter l'equipe qu'un formulaire est encore attendu. Un rappel automatique peut etre envoye 24 heures avant le culte si les formulaires ne sont pas complets."))

story.append(heading("2.6 Consultation dans le dashboard media", level=1))
story.append(body("Le departement media accede au tableau de bord de planification dans le Media Center. Il y voit la liste des cultes a venir, avec pour chaque culte un resume visuel du statut (en attente, partiel, complet). En cliquant sur un culte, il accede aux details complets : le theme, les versets, les grands points, le resume du message de l'orateur, et l'ordre complet du culte defini par le president. Ces informations permettent a l'equipe de preparation visuelle de creer les slides, a l'equipe son de preparer les pistes audio, et a l'equipe video de planifier les plans de prise de vue. Tout est visible en un seul endroit, plusieurs jours avant le culte."))

story.append(heading("2.7 Supervision par le pasteur principal", level=1))
story.append(body("Le pasteur principal dispose d'un panneau de supervision dedie, accessible depuis le dashboard principal de la PWA. Il peut voir tous les cultes programmes, consulter les formulaires remplis, ajouter des remarques ou des directives, et valider le programme final. Ce niveau de supervision garantit une coherence spirituelle et logistique dans l'ensemble des cultes de l'eglise, y compris ceux des extensions."))

# ═══ 3. STRUCTURE DES FORMULAIRES ═══
story.append(heading("3. Structure exacte des formulaires"))

story.append(heading("3.1 Formulaire orateur", level=1))
story.append(body("Le formulaire orateur est compose de neuf champs, dont cinq obligatoires et quatre optionnels. Chaque champ a ete concu pour capturer les informations essentielles dont le departement media a besoin pour preparer le culte. La saisie du verset biblique est facilitee par un systeme de recherche en deux etapes : l'utilisateur selectionne d'abord le livre dans une liste deroulante des 66 livres de la Bible, puis entre le chapitre et le verset dans des champs numeriques simples."))
story.append(make_table(
    ['Champ', 'Type', 'Obligatoire', 'Description'],
    [
        ["Nom de l'orateur", 'Texte (autocomplete)', 'Oui', 'Recherche dans la base des orateurs connus'],
        ['Theme principal', 'Texte (textarea)', 'Oui', 'Le sujet central du message'],
        ['Sous-theme', 'Texte (textarea)', 'Oui', 'Precision ou angle du message'],
        ['Verset biblique', 'Liste + chapitre/verset', 'Oui', 'Selection du livre puis reference precise'],
        ['Grands points', 'Liste dynamique (+/-)', 'Oui', 'Points cles du message (ajout illimite)'],
        ['Sous-points', 'Liste dynamique (+/-)', 'Non', 'Details sous chaque grand point'],
        ['Resume du message', 'Texte (textarea)', 'Oui', 'Synthese en 3-5 phrases pour le departement'],
        ['Remarques / Avis', 'Texte (textarea)', 'Non', 'Notes speciales, consignes de projection'],
        ['Fichiers joints', 'Upload (images/PDF)', 'Non', "Supports visuels de l'orateur"],
    ],
    [CONTENT_W*0.18, CONTENT_W*0.22, CONTENT_W*0.12, CONTENT_W*0.48],
))
story.append(Spacer(1, 4*mm))
story.append(caption("Tableau 1 : Structure du formulaire orateur"))

story.append(heading("3.2 Formulaire president de culte", level=1))
story.append(body("Le formulaire president de culte est centre sur la definition de l'ordre du culte. Il dispose d'une interface de glisser-deposer (ou de fleches haut/bas sur mobile) pour organiser les etapes du culte dans l'ordre souhaite. Chaque etape est selectionnee dans une liste predefinie, et le president peut en ajouter de nouvelles si necessaire. Le systeme permet egalement de definir des sous-etapes pour les elements complexes comme la louange (liste de chants) ou les temoignages (nombre de temoignants prevus)."))
story.append(make_table(
    ['Champ', 'Type', 'Obligatoire', 'Description'],
    [
        ['Ordre du culte', 'Drag-and-drop list', 'Oui', 'Sequence reorganisable des etapes'],
        ['Etape', 'Selection predefinie', 'Oui', 'Choix parmi la liste des etapes disponibles'],
        ['Duree estimee', 'Selecteur (5/10/15/20/30 min)', 'Non', 'Temps prevu pour chaque etape'],
        ['Notes par etape', 'Texte (textarea)', 'Non', 'Instructions ou details supplementaires'],
        ['Responsable', 'Texte (autocomplete)', 'Non', "Personne en charge de l'etape"],
        ['Liste de chants', 'Liste dynamique', 'Non', 'Pour les etapes louange/adoration'],
        ['Remarques generales', 'Texte (textarea)', 'Non', 'Notes globales sur le deroulement'],
    ],
    [CONTENT_W*0.18, CONTENT_W*0.22, CONTENT_W*0.12, CONTENT_W*0.48],
))
story.append(Spacer(1, 4*mm))
story.append(caption("Tableau 2 : Structure du formulaire president de culte"))

story.append(heading("3.3 Etapes predefinies du culte", level=1))
story.append(body("Le systeme propose une liste de 15 etapes predefinies que le president peut utiliser pour construire l'ordre du culte. Ces etapes couvrent la quasi-totalite des elements d'un culte charismatique typique. Le president peut egalement creer des etapes personnalisees si une situation specifique l'exige."))
story.append(make_table(
    ['Etape', 'Identifiant technique'],
    [
        ['Accueil des fidèles et invités', 'etape-accueil'],
        ['Prière d\'ouverture', 'etape-priere-ouverture'],
        ['Louange', 'etape-louange'],
        ['Adoration', 'etape-adoration'],
        ['Témoignages', 'etape-temoignages'],
        ['Communiqués / Annonces', 'etape-communiques'],
        ['Offrande', 'etape-offrande'],
        ['Sainte Cène', 'etape-sainte-cene'],
        ['Prière pour les nouveaux convertis', 'etape-priere-nouveaux'],
        ['Prière pour les malades', 'etape-priere-malades'],
        ['Prédication', 'etape-predication'],
        ['Intervention spéciale', 'etape-intervention'],
        ['Prière de conclusion', 'etape-priere-fin'],
        ['Bénédiction finale', 'etape-benediction'],
        ['Autre (personnalisé)', 'etape-autre'],
    ],
    [CONTENT_W*0.65, CONTENT_W*0.35],
))
story.append(Spacer(1, 4*mm))
story.append(caption("Tableau 3 : Liste des etapes predefinies du culte"))

# ═══ 4. INTERFACE DE TRI ═══
story.append(heading("4. Interface de tri de l'ordre du culte"))
story.append(body("L'interface de tri est l'element le plus critique du formulaire president de culte. Elle doit etre intuitive, rapide et fonctionner parfaitement sur mobile, car c'est sur telephone que la plupart des presidents de culte rempliront le formulaire. Deux modes d'interaction sont proposes : le glisser-deposer pour les utilisateurs sur ordinateur, et les fleches de deplacement pour les utilisateurs sur mobile."))

story.append(heading("4.1 Comportement desktop (glisser-deposer)", level=1))
story.append(body("Sur desktop, chaque etape du culte est representee par une carte avec une poignee de glissement a gauche (six points verticaux). L'utilisateur saisit la carte et la deplace a la position souhaitee. Un espace visuel s'ouvre entre les cartes pour indiquer la zone de depot. Le reordonnancement se fait en temps reel, sans necessite de cliquer sur un bouton de validation. Chaque carte affiche le nom de l'etape, son numero d'ordre, et un bouton de suppression (icone poubelle) visible au survol. Un compteur en haut de la liste indique le nombre total d'etapes."))

story.append(heading("4.2 Comportement mobile (fleches)", level=1))
story.append(body("Sur mobile, le glisser-deposer natif peut etre imprecis. C'est pourquoi un systeme de fleches est propose en alternative. Chaque carte affiche deux fleches (haut et bas) a droite. Un appui sur la fleche haut deplace l'etape d'une position vers le haut, et inversement. Un appui long sur une carte ouvre un menu contextuel avec les options : deplacer en haut, deplacer en bas, dupliquer, supprimer, modifier. Cette approche garantit une experience fluide meme sur les ecrans tactiles les plus petits."))

story.append(heading("4.3 Ajout d'une etape", level=1))
story.append(body("Un bouton 'Ajouter une etape' est visible en bas de la liste et aussi en haut pour un acces rapide. Au clic, il affiche un menu deroulant avec les 15 etapes predefinies, plus une option 'Personnalisee' qui ouvre un champ texte libre. L'etape ajoutee est placee a la fin de la liste par defaut, puis l'utilisateur la deplace a la position souhaitee. Une etape ne peut etre ajoutee qu'une seule fois par defaut, mais le systeme permet de la dupliquer si necessaire."))

# ═══ 5. DASHBOARD MEDIA ═══
story.append(heading("5. Dashboard media"))
story.append(body("Le dashboard media est le centre nerveux de la planification. Il est integre directement dans le Media Center existant de la PWA, accessible depuis l'onglet 'Planification' ou via un raccourci dans la barre laterale. L'interface est divisee en trois zones principales : la liste des cultes a venir, le detail d'un culte selectionne, et un panneau de synthese rapide."))

story.append(heading("5.1 Vue liste des cultes", level=1))
story.append(body("La vue liste affiche tous les cultes programmes, tries par date du plus proche au plus eloigne. Chaque carte de culte affiche : la date et l'heure, le type de culte, le statut global (trois etats visuels distincts avec des couleurs differentes : vert pour complet, orange pour partiel, rouge pour en attente), le nom de l'orateur si le formulaire est rempli, et un indicateur de nombre d'etapes definies pour le formulaire president. Des filtres permettent de n'afficher que les cultes d'un statut donne ou d'une periode specifique."))

story.append(heading("5.2 Vue detail d'un culte", level=1))
story.append(body("Lorsqu'un coordinateur clique sur un culte, il accede a la vue detail qui se divise en deux colonnes sur desktop et en onglets sur mobile. La colonne de gauche affiche les informations de l'orateur (theme, sous-theme, verset biblique, grands points, sous-points, resume, remarques, fichiers joints). La colonne de droite affiche l'ordre du culte defini par le president, avec chaque etape dans l'ordre exact, la duree estimee, les notes et les eventuels chants. Un bouton 'Exporter en PDF' permet de generer un document imprimable contenant toutes les informations du culte, utile pour les equipes techniques qui preferent avoir un support papier."))

story.append(heading("5.3 Panneau de supervision du pasteur", level=1))
story.append(body("Le pasteur principal dispose d'un panneau dedie accessible depuis son dashboard, distinct du panneau media. Ce panneau affiche tous les cultes de l'eglise (y compris ceux des extensions), avec la possibilite de filtrer par extension. Il peut consulter les formulaires, ajouter des commentaires ou des directives, et marquer un culte comme 'Valide' une fois qu'il a revu le programme. Cette validation est visible par le departement media sous forme de badge vert, indiquant que le programme est approuve par la direction spirituelle."))

# ═══ 6. ROLES ET PERMISSIONS ═══
story.append(heading("6. Roles et permissions"))
story.append(body("Le systeme de planification s'appuie sur quatre roles distincts, chacun ayant un niveau d'acces specifique. Ces roles s'integrent dans le systeme d'authentification et de permissions deja existant dans la PWA, en ajoutant deux nouvelles permissions specifiques a la planification."))
story.append(make_table(
    ['Role', 'Creer culte', 'Voir formulaires', 'Superviser', 'Valider'],
    [
        ['Coordinateur Media', 'Oui', 'Oui (son dept.)', 'Non', 'Non'],
        ['Membre Media', 'Non', 'Oui (lecture seule)', 'Non', 'Non'],
        ['President de culte', 'Non', 'Oui (ses cultes)', 'Non', 'Non'],
        ['Orateur', 'Non', 'Oui (ses formulaires)', 'Non', 'Non'],
        ['Pasteur Principal', 'Oui', 'Oui (tous)', 'Oui', 'Oui'],
        ['Admin systeme', 'Oui', 'Oui (tous)', 'Oui', 'Oui'],
    ],
    [CONTENT_W*0.22, CONTENT_W*0.14, CONTENT_W*0.24, CONTENT_W*0.18, CONTENT_W*0.14],
))
story.append(Spacer(1, 4*mm))
story.append(caption("Tableau 4 : Matrice des permissions par role"))
story.append(body("Les permissions sont implementees via des Row Level Security (RLS) policies dans Supabase. Chaque formulaire et chaque culte ont un champ 'created_by' qui permet de filtrer l'acces selon l'utilisateur connecte. Le pasteur principal et l'admin systeme disposent d'un acces global. Les orateurs et presidents de culte, bien qu'ils remplissent des formulaires, n'ont pas besoin de compte : ils accedent au formulaire via un lien publique signe par un token a usage unique."))

# ═══ 7. BASE DE DONNEES ═══
story.append(heading("7. Base de donnees"))
story.append(body("Le schema de base de donnees utilise les tables Supabase existantes comme point d'ancrage (users, user_profiles, roles) et ajoute quatre nouvelles tables specifiques a la planification du culte. Le choix de Supabase comme backend est delibere : il offre une synchronisation temps reel, un systeme d'authentification integre, des RLS policies pour la securite, et une API REST auto-generee qui accelere considerablement le developpement."))

story.append(heading("7.1 worship_services", level=1))
story.append(make_table(
    ['Colonne', 'Type', 'Contrainte', 'Description'],
    [
        ['id', 'UUID', 'PK, DEFAULT gen_random_uuid()', 'Identifiant unique'],
        ['title', 'TEXT', 'NOT NULL', 'Titre du culte'],
        ['service_date', 'DATE', 'NOT NULL', 'Date du culte'],
        ['service_time', 'TIME', 'NOT NULL', 'Heure de debut'],
        ['service_type', 'TEXT', 'DEFAULT regular', 'regular, special, veille, concert'],
        ['status', 'TEXT', 'DEFAULT draft', 'draft, pending, partial, complete, validated'],
        ['orateur_form_token', 'TEXT', 'UNIQUE', "Token d'acces formulaire orateur"],
        ['president_form_token', 'TEXT', 'UNIQUE', "Token d'acces formulaire president"],
        ['created_by', 'UUID', 'FK -> users.id', 'Createur du culte'],
        ['extension_id', 'UUID', 'FK -> extensions.id, NULLABLE', 'Extension concernee'],
        ['created_at', 'TIMESTAMPTZ', 'DEFAULT now()', 'Date de creation'],
        ['updated_at', 'TIMESTAMPTZ', 'DEFAULT now()', 'Derniere modification'],
    ],
    [CONTENT_W*0.18, CONTENT_W*0.18, CONTENT_W*0.28, CONTENT_W*0.36],
))
story.append(Spacer(1, 4*mm))
story.append(caption("Tableau 5 : Table worship_services"))

story.append(heading("7.2 speaker_forms", level=1))
story.append(make_table(
    ['Colonne', 'Type', 'Contrainte', 'Description'],
    [
        ['id', 'UUID', 'PK', 'Identifiant unique'],
        ['service_id', 'UUID', 'FK -> worship_services.id, UNIQUE', 'Culte associe'],
        ['speaker_name', 'TEXT', 'NOT NULL', "Nom de l'orateur"],
        ['main_theme', 'TEXT', 'NOT NULL', 'Theme principal'],
        ['sub_theme', 'TEXT', 'NOT NULL', 'Sous-theme'],
        ['bible_book', 'TEXT', 'NOT NULL', 'Livre biblique'],
        ['bible_chapter', 'INTEGER', 'NOT NULL', 'Chapitre'],
        ['bible_verse_start', 'INTEGER', 'NOT NULL', 'Verset de debut'],
        ['bible_verse_end', 'INTEGER', 'NULLABLE', 'Verset de fin'],
        ['main_points', 'JSONB', 'NOT NULL', 'Grands points [{title, sub_points}]'],
        ['summary', 'TEXT', 'NOT NULL', 'Resume du message'],
        ['remarks', 'TEXT', 'NULLABLE', 'Remarques et avis'],
        ['attachments', 'JSONB', 'NULLABLE', "Fichiers joints [{url, name, type}]"],
        ['submitted_at', 'TIMESTAMPTZ', 'NULLABLE', 'Date de soumission'],
        ['created_at', 'TIMESTAMPTZ', 'DEFAULT now()', 'Date de creation'],
    ],
    [CONTENT_W*0.18, CONTENT_W*0.16, CONTENT_W*0.26, CONTENT_W*0.40],
))
story.append(Spacer(1, 4*mm))
story.append(caption("Tableau 6 : Table speaker_forms"))

story.append(heading("7.3 worship_orders", level=1))
story.append(make_table(
    ['Colonne', 'Type', 'Contrainte', 'Description'],
    [
        ['id', 'UUID', 'PK', 'Identifiant unique'],
        ['service_id', 'UUID', 'FK -> worship_services.id', 'Culte associe'],
        ['step_type', 'TEXT', 'NOT NULL', "Identifiant de l'etape"],
        ['step_label', 'TEXT', 'NOT NULL', 'Label affiche'],
        ['sort_order', 'INTEGER', 'NOT NULL', "Position (reorganisable)"],
        ['estimated_duration', 'INTEGER', 'NULLABLE', 'Duree estimee en minutes'],
        ['notes', 'TEXT', 'NULLABLE', 'Notes pour cette etape'],
        ['songs', 'JSONB', 'NULLABLE', 'Liste de chants [{title, artist, key}]'],
        ['responsible', 'TEXT', 'NULLABLE', "Responsable de l'etape"],
        ['submitted_at', 'TIMESTAMPTZ', 'NULLABLE', 'Date de soumission'],
    ],
    [CONTENT_W*0.18, CONTENT_W*0.16, CONTENT_W*0.28, CONTENT_W*0.38],
))
story.append(Spacer(1, 4*mm))
story.append(caption("Tableau 7 : Table worship_orders"))

story.append(heading("7.4 worship_service_steps", level=1))
story.append(body("Cette table de reference contient la liste des etapes predefinies du culte. Elle est initialisee avec les 15 etapes decrites dans la section 3.3, mais peut etre enrichie par l'admin systeme pour ajouter des etapes specifiques a l'eglise. Chaque enregistrement inclut un identifiant technique unique, un label affichable, une description, une icone (nom d'icone Lucide), un indicateur de duree par defaut, et un flag pour savoir si l'etape est active."))
story.append(make_table(
    ['Colonne', 'Type', 'Description'],
    [
        ['id', 'UUID', 'Identifiant unique'],
        ['step_key', 'TEXT UNIQUE', "Cle technique (ex: etape-louange)"],
        ['label', 'TEXT', 'Label affiche'],
        ['description', 'TEXT', 'Description de l\'etape'],
        ['icon', 'TEXT', "Icone Lucide ou emoji"],
        ['default_duration', 'INTEGER', 'Duree par defaut en minutes'],
        ['is_active', 'BOOLEAN', 'Etape active dans le selecteur'],
        ['sort_order', 'INTEGER', "Ordre d'affichage dans le selecteur"],
    ],
    [CONTENT_W*0.22, CONTENT_W*0.22, CONTENT_W*0.56],
))
story.append(Spacer(1, 4*mm))
story.append(caption("Tableau 8 : Table worship_service_steps"))

# ═══ 8. INNOVATIONS ═══
story.append(heading("8. Innovations proposees"))
story.append(body("Au-dela du MVP, plusieurs innovations peuvent etre progresivement integrees pour enrichir l'experience de planification et apporter une valeur ajoutee significative a l'eglise. Ces innovations ont ete pensees pour repondre aux besoins specifiques d'un contexte ecclesiastique africain, tout en restant realisables avec les technologies existantes."))

story.append(heading("8.1 Generation automatique de slides", level=1))
story.append(body("A partir des informations du formulaire orateur (theme, verset biblique, grands points), le systeme peut generer automatiquement un jeu de slides de base pour le culte. Chaque grand point devient une slide avec le verset biblique en entete et le theme en titre. Le departement media n'a plus qu'a personnaliser le style visuel au lieu de creer les slides de zero. Cette fonctionnalite peut utiliser un template integre via l'API ou un moteur de generation de slides en HTML/CSS convertible en images PNG."))

story.append(heading("8.2 Historique et statistiques", level=1))
story.append(body("Le systeme peut compiler un historique complet de tous les cultes passes : quels orateurs sont intervenus, quels themes ont ete abordes, quels versets ont ete references. Le pasteur principal peut consulter des statistiques pour eviter les repetitions, identifier les orateurs les plus sollicites, et planifier une couverture thematique equilibree sur l'annee. Un tableau de bord statistique peut afficher des graphiques de repartition par theme, par livre biblique, par orateur et par mois."))

story.append(heading("8.3 Synchronisation multi-extensions", level=1))
story.append(body("Pour les eglises avec plusieurs extensions, le systeme peut offrir une vue consolidee de tous les cultes de toutes les extensions en un seul tableau de bord. Le pasteur principal peut ainsi superviser l'ensemble de la planification depuis un seul ecran, avec la possibilite de filtrer par extension, par date ou par statut. Les responsables d'extensions ne voient que les cultes de leur propre extension, grace aux RLS policies."))

story.append(heading("8.4 Modeles de formulaires reutilisables", level=1))
story.append(body("Les pasteurs et presidents de culte peuvent enregistrer des modeles de formulaires. Par exemple, un president qui utilise souvent le meme ordre de culte peut l'enregistrer comme modele et le reutiliser en un clic pour les cultes suivants, en ne modifiant que les elements variables. De meme, un orateur qui predique en serie sur un meme theme peut reutiliser son formulaire precedent comme base et ne mettre a jour que les elements qui changent."))

story.append(heading("8.5 Notifications intelligentes", level=1))
story.append(body("Le systeme peut envoyer des notifications contextuelles et intelligentes. Par exemple : un rappel automatique 48 heures avant le culte si les formulaires ne sont pas complets, une notification au departement media quand un formulaire est soumis avec un fichier joint de grande taille (indiquant qu'une preparation supplementaire est necessaire), ou une alerte au pasteur si un orateur a soumis un formulaire avec un theme sensible necessitant une relecture."))

# ═══ 9. MVP ═══
story.append(heading("9. MVP recommande"))
story.append(body("Le Minimum Viable Product doit se concentrer sur le flux essentiel : creation d'un culte, generation des liens, envoi WhatsApp, remplissage des formulaires, et consultation dans le dashboard. Toute fonctionnalite secondaire (statistiques, generation de slides, modeles) est reportee a la phase evolutive. Le MVP doit etre deployable en une a deux semaines de developpement, en s'appuyant sur l'infrastructure existante."))

story.append(heading("9.1 Perimetre du MVP", level=1))
story.append(make_table(
    ['Fonctionnalite', 'Priorite', 'Complexite', 'Delai'],
    [
        ['Creation d\'un culte (date, heure, type)', 'P0', 'Faible', '1 jour'],
        ['Generation des liens de formulaires', 'P0', 'Faible', '0.5 jour'],
        ['Envoi WhatsApp (bouton integre)', 'P0', 'Faible', '0.5 jour'],
        ['Formulaire orateur (9 champs)', 'P0', 'Moyenne', '2 jours'],
        ['Formulaire president (ordre du culte)', 'P0', 'Moyenne', '2 jours'],
        ['Tri par fleches (mobile)', 'P0', 'Moyenne', '1 jour'],
        ['Dashboard media (liste + detail)', 'P0', 'Moyenne', '2 jours'],
        ['Notification push (soumission)', 'P1', 'Faible', '0.5 jour'],
        ['Panneau pasteur (supervision)', 'P1', 'Faible', '1 jour'],
        ['Export PDF du programme', 'P1', 'Moyenne', '1 jour'],
        ['Drag-and-drop (desktop)', 'P2', 'Moyenne', '1 jour'],
        ['Sauvegarde automatique locale', 'P1', 'Faible', '0.5 jour'],
    ],
    [CONTENT_W*0.42, CONTENT_W*0.14, CONTENT_W*0.18, CONTENT_W*0.16],
))
story.append(Spacer(1, 4*mm))
story.append(caption("Tableau 9 : Perimetre et delais du MVP"))
story.append(body("Le MVP cible un delai total de 8 a 10 jours ouvrables. La priorite P0 represente le noyau fonctionnel indispensable. Les priorites P1 peuvent etre ajoutees dans la semaine suivant le deploiement initial. La priorite P2 (drag-and-drop) est une amelioration de l'experience utilisateur qui n'est pas bloquante pour le lancement."))

story.append(heading("9.2 Stack technique du MVP", level=1))
story.append(bullet("Frontend : React + TypeScript + Tailwind CSS (deja en place dans la PWA)"))
story.append(bullet("Backend : Supabase (PostgreSQL + RLS + API REST auto-generee)"))
story.append(bullet("Auth : Supabase Auth (deja en place, ajout de permissions specifiques)"))
story.append(bullet("Formulaires publics : Routes React publiques avec token signe"))
story.append(bullet("Tri mobile : Implementations de fleches haut/bas avec gestion d'etat React"))
story.append(bullet("Notifications : Supabase Realtime (deja configure dans la PWA)"))
story.append(bullet("WhatsApp : Lien wa.me avec message pre-rempli"))
story.append(bullet("PWA : Service Worker + localStorage pour la sauvegarde automatique"))

# ═══ 10. EVOLUTIONS FUTURES ═══
story.append(heading("10. Evolutions futures"))
story.append(body("Au-dela du MVP, la fonctionnalite de planification du culte peut evoluer vers un systeme de gestion pastorale complet. Voici la feuille de route proposee, organisee en trois phases chronologiques, chacune s'appuyant sur les fonctionnalites de la phase precedente."))

story.append(heading("Phase 2 : Enrichissement (mois 2-3)", level=1))
story.append(bullet("Generation semi-automatique de slides a partir des grands points de l'orateur"))
story.append(bullet("Modeles de formulaires enregistrables et reutilisables par les orateurs et presidents"))
story.append(bullet("Systeme de commentaires sur les formulaires (discussion entre media et orateur)"))
story.append(bullet("Dashboard statistique : reperage des themes, versets et orateurs les plus frequents"))
story.append(bullet("Support multi-langues (formulaires disponibles en francais, lingala, swahili, anglais)"))
story.append(bullet("Historique complet des cultes passes avec recherche et filtrage avance"))

story.append(heading("Phase 3 : Intelligence (mois 4-6)", level=1))
story.append(bullet("Suggestion automatique de versets en fonction du theme (base de donnees biblique integree)"))
story.append(bullet("Planning previsionnel automatique base sur le calendrier liturgique"))
story.append(bullet("Integration avec un systeme de gestion de chansons (repertoire de louange existant)"))
story.append(bullet("Notifications predictives basees sur l'historique (rappels adaptes aux habitudes de chacun)"))
story.append(bullet("Tableau de bord consolide multi-extensions pour le pasteur principal"))
story.append(bullet("Export vers des outils externes (ProPresenter, EasyWorship, OpenLP) au format JSON"))

story.append(heading("Phase 4 : Ecosysteme (mois 6+)", level=1))
story.append(bullet("Application mobile native dediee (au-dela de la PWA) pour une meilleure experience hors-ligne"))
story.append(bullet("Integration avec des systemes de streaming pour un affichage en temps reel du programme"))
story.append(bullet("Systeme de feedback post-culte (questionnaires de satisfaction pour les fidèles)"))
story.append(bullet("Gestion des repetitions de louange et integration avec le repertoire musical de l'eglise"))
story.append(bullet("Planning collaboratif en temps reel avec plusieurs editeurs simultanes"))
story.append(bullet("API ouverte pour les extensions qui souhaiteraient integrer leur propre systeme"))
story.append(Spacer(1, 6*mm))
story.append(hr())
story.append(Spacer(1, 4*mm))
story.append(body("Ce document presente l'architecture fonctionnelle complete du systeme de planification du culte pour l'Eglise Evangelique La Conquete. La conception est centree sur la simplicite d'utilisation, la robustesse technique et l'integration fluide avec l'infrastructure existante. Le MVP propose un delai de realisation de 8 a 10 jours, avec un perimetre clairement defini et des evolutions progressives realistes sur six mois. L'ensemble du systeme repose sur des technologies deja maitrisees par l'equipe (React, Supabase, PWA), ce qui minimise les risques techniques et accelere le deploiement."))

OUTPUT = '/home/z/my-project/download/Planification_Culte_Architecture.pdf'
doc = TocDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=LEFT_M, rightMargin=RIGHT_M, topMargin=TOP_M, bottomMargin=BOT_M,
    title='Planification du Culte - Architecture Fonctionnelle',
    author='Eglise Evangelique La Conquete',
    subject='Specification fonctionnelle du systeme de planification des cultes',
)
doc.multiBuild(story)
print('PDF generated:', OUTPUT)