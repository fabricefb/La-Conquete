/* Articles éditoriaux — rédigés à partir des communications officielles de
   l'église (pages Facebook « Laconquete Eec » et « Eglise évangélique la
   conquête »). Les faits datés et les citations bibliques sont sourcés. */

import type { SiteArticle } from '../types';

export type ArticleCategory = 'Enseignement' | 'Événement' | 'Annonce' | 'Vision';

const ARTICLE_CATEGORIES: ArticleCategory[] = ['Enseignement', 'Événement', 'Annonce', 'Vision'];

export interface Article {
  slug: string;
  title: string;
  category: ArticleCategory;
  date: string;
  excerpt: string;
  image: string;
  featured?: boolean;
  source?: string;
  body: string[];
  quote?: { text: string; reference: string };
}

export const ARTICLES: Article[] = [
  {
    slug: 'marathon-de-priere-2026',
    title: "Marathon de prière : trente jours pour la mission de l'Église",
    category: 'Annonce',
    date: '2026-10-11',
    excerpt:
      "Du 1er au 30 novembre 2026, l'Église Évangélique La Conquête consacre un mois entier à la prière autour du thème « La mission de l'Église locale face au monde moderne ».",
    image: '/priere.webp',
    featured: true,
    source: 'https://web.facebook.com/laconquete.eec',
    body: [
      "Du 1er au 30 novembre 2026, l'Église Évangélique La Conquête ouvre un mois de prière continu. Le thème retenu est celui qui structure l'enseignement de la saison : « La mission de l'Église locale face au monde moderne », appuyé sur Matthieu 28:19-20.",
      "Les rencontres se tiennent au temple, au 520, avenue N'Djamena, coin Mama Yemo, à Lubumbashi. Du lundi au vendredi, le marathon se déroule de 16 h à 18 h 45 ; le dimanche, de 8 h à 10 h 30. Trente jours, sans interruption, pour porter ensemble la ville, les familles et les extensions de l'église.",
      "Prier avant d'agir n'est pas une précaution, c'est l'ordre du Royaume. Avant de confier une mission à ses disciples, Jésus leur demande d'attendre la promesse du Père. L'Église locale ne tire pas sa force de ses moyens, mais de la présence de Dieu au milieu d'elle.",
      "Que demander pendant ce mois ? Que la Parole soit annoncée avec clarté ; que les malades soient visités et fortifiés ; que les familles trouvent la paix ; que les jeunes de la Génération Espoir grandissent dans la foi ; que les extensions, notamment à Kakana, soient soutenues ; et que la ville de Lubumbashi entende l'Évangile.",
      "Chaque membre est invité à prendre sa part, même pour une heure. Une heure de prière ajoutée à celles des autres devient un mur de feu autour de l'église. Venez avec votre Bible, un carnet et une intention précise.",
      "Que ceux qui ne peuvent pas se déplacer s'associent depuis leur maison, aux mêmes horaires, et invitent une personne à les rejoindre. Un marathon se gagne ensemble.",
    ],
    quote: {
      text: "Allez, faites de toutes les nations des disciples, les baptisant au nom du Père, du Fils et du Saint-Esprit.",
      reference: 'Matthieu 28:19',
    },
  },
  {
    slug: 'la-vision-de-la-conquete',
    title: 'Notre vision : les âmes, les terres habitables et cultivables',
    category: 'Vision',
    date: '2026-10-11',
    excerpt:
      "La Conquête porte une vision en deux mouvements, inscrite dans Psaumes 2:8 : gagner des âmes et ouvrir des terres où la vie peut s'enraciner.",
    image: '/church-photo-1.webp',
    source: 'https://web.facebook.com/profile.php?id=61569888994546',
    body: [
      "La vision de l'Église Évangélique La Conquête s'énonce en une phrase : « La conquête des âmes, la conquête des terres habitables et cultivables ». Elle s'appuie sur Psaumes 2:8 : « Demande-moi, et je te donnerai les nations pour héritage, les extrémités de la terre pour possession. »",
      "La conquête commence par une demande. Avant d'être un programme, elle est une prière adressée au Père. Une église qui ne demande rien reçoit peu ; une église qui demande selon la promesse reçoit des nations.",
      "Conquérir des âmes, c'est refuser de considérer une personne comme un simple chiffre. C'est annoncer Jésus-Christ à celui qui est loin, accueillir celui qui revient, former celui qui débute. L'Évangile n'est pas une idée à défendre, c'est une vie à partager.",
      "Conquérir des terres habitables et cultivables, c'est prendre au sérieux l'enracinement. Une église ne s'arrête pas à un culte : elle bâtit des lieux où l'on vit, où l'on travaille, où l'on nourrit les siens, où l'on transmet la foi aux enfants. La terre, dans la Bible, est toujours le lieu de la promesse et de la responsabilité.",
      "Cette seconde partie de la vision a déjà un visage. Le dimanche 20 juillet 2025, le pasteur Josué Romain Kazadi, représentant légal de la communauté des églises évangéliques La Conquête, a posé la première pierre du Centre Évangélique Missionnaire La Conquête Kakana, à 50 km de Lubumbashi. La vision est devenue un chantier.",
      "Une vision n'engage jamais un seul homme. Elle engage des pasteurs assistants, des anciens, des diacres, des responsables de départements et chaque membre. C'est pourquoi nous la rappelons régulièrement : ce que Dieu nous confie, il le confie à un peuple.",
    ],
    quote: {
      text: "Demande-moi, et je te donnerai les nations pour héritage, les extrémités de la terre pour possession.",
      reference: 'Psaumes 2:8',
    },
  },
  {
    slug: 'la-mission-de-leglise-locale',
    title: "La mission de l'Église locale face au monde moderne",
    category: 'Enseignement',
    date: '2026-10-11',
    excerpt:
      "Série d'enseignement de la saison : comment l'Église locale demeure missionnaire dans un monde qui change de visage, sans rien perdre de l'essentiel.",
    image: '/predication-1.webp',
    source: 'https://web.facebook.com/laconquete.eec',
    body: [
      "Depuis le mois d'octobre 2026, l'Église Évangélique La Conquête enseigne sur un thème unique : « La mission de l'Église locale face au monde moderne ». Le texte de référence est l'envoi de Jésus à ses disciples en Matthieu 28:19-20.",
      "Le monde moderne n'est pas d'abord un ennemi à combattre : c'est un champ à labourer. Les habitudes changent, les familles se dispersent, les écrans prennent la place des conversations, mais la soif de sens reste intacte. L'Église locale est placée exactement là où cette soif se manifeste.",
      "Trois convictions structurent cet enseignement. La première est la présence : une église doit être physiquement là, dans son quartier, disponible aux heures où les gens souffrent. La deuxième est la Parole : sans elle, la communauté devient une association de bonne volonté. La troisième est l'envoi : chaque membre est un missionnaire dans sa maison, son travail et son école.",
      "La mission ne se réduit pas à des événements. Elle se vérifie dans la fidélité quotidienne : visiter un malade, soutenir une veuve, accompagner un jeune, prier avant de décider. C'est ainsi que l'Évangile devient crédible aux yeux de la ville.",
      "L'Église locale est aussi une famille de familles. Ce que nous enseignons le dimanche doit pouvoir être vécu le lundi. C'est pourquoi les cultes sont diffusés en direct sur nos pages : celui qui ne peut pas venir peut encore entendre, et celui qui a entendu peut transmettre.",
      "Une église missionnaire n'est pas une église qui court plus vite, mais une église qui sait pourquoi elle marche. Face au monde moderne, notre réponse n'est pas la peur ni l'imitation : c'est la fidélité créative à l'ordre reçu.",
    ],
    quote: {
      text: 'Allez, faites de toutes les nations des disciples, les baptisant au nom du Père, du Fils et du Saint-Esprit, et enseignez-leur à observer tout ce que je vous ai prescrit.',
      reference: 'Matthieu 28:19-20',
    },
  },
  {
    slug: 'le-nom-de-jesus-notre-heritage',
    title: "Le nom de Jésus, l'héritage commun de tous les croyants",
    category: 'Enseignement',
    date: '2026-10-11',
    excerpt:
      "Sous-thème développé lors du culte du 11 octobre 2026 : ce que nous partageons, bien avant nos différences, c'est un même nom.",
    image: '/bible.webp',
    source: 'https://web.facebook.com/laconquete.eec',
    body: [
      "Dans la série « La mission de l'Église locale face au monde moderne », le culte du dimanche 11 octobre 2026 a ouvert un sous-thème décisif : « Le nom de Jésus, l'héritage commun de tous les croyants ».",
      "Un héritage est ce que l'on reçoit sans l'avoir gagné, et ce que l'on transmet sans pouvoir le garder pour soi. Le nom de Jésus est de cet ordre. Il n'appartient pas à une génération, à une sensibilité ou à un quartier : il est la part commune de tous ceux qui croient.",
      "La Bible ne laisse aucune place à l'ambiguïté : « Il n'y a sous le ciel aucun autre nom qui ait été donné parmi les hommes, par lequel nous devions être sauvés » (Actes 4:12). Ce nom n'est pas un slogan, c'est une puissance qui sauve, qui relève et qui rassemble.",
      "Parce que l'héritage est commun, la division entre croyants devient une contradiction. On peut différer sur des méthodes ; on ne peut pas se réclamer du même nom et refuser de porter ensemble la mission. L'unité n'est pas une option diplomatique, c'est une conséquence de l'héritage.",
      "Cet héritage se reçoit dans la prière et se confesse dans la vie. Prier au nom de Jésus, ce n'est pas ajouter une formule à la fin d'une requête ; c'est s'approcher du Père avec les seuls droits du Fils.",
      "En ce mois de prière, une question simple nous est posée : que faisons-nous de ce nom ? Le porter dans nos maisons, au travail, auprès de ceux qui ne le connaissent pas encore.",
    ],
    quote: {
      text: "Il n'y a sous le ciel aucun autre nom qui ait été donné parmi les hommes, par lequel nous devions être sauvés.",
      reference: 'Actes 4:12',
    },
  },
  {
    slug: 'engager-avec-dieu-et-la-recompense',
    title: 'Engager avec Dieu et la récompense',
    category: 'Enseignement',
    date: '2026-10-19',
    excerpt:
      "Sous-thème du culte du 19 octobre 2026 : s'engager n'est pas acheter la faveur de Dieu, mais répondre à une grâce qui nous a déjà précédés.",
    image: '/church-photo-2.webp',
    source: 'https://web.facebook.com/laconquete.eec',
    body: [
      "Dans la série consacrée à la mission de l'Église locale, le culte du dimanche 19 octobre 2026 a mis en avant un sous-thème exigeant : « Engager avec Dieu et la récompense ».",
      "S'engager, dans le langage biblique, c'est offrir son corps comme un sacrifice vivant (Romains 12:1). Ce n'est pas une transaction par laquelle on obtiendrait un avantage, mais la réponse normale d'une personne qui a compris ce qu'elle a reçu.",
      "Le renoncement n'est jamais une perte sèche dans l'économie de Dieu. « Celui qui s'approche de Dieu doit croire qu'il existe et qu'il récompense ceux qui le cherchent » (Hébreux 11:6). La récompense est une réalité promise, mais elle n'est pas toujours immédiate ni matérielle.",
      "C'est ici que la foi est éprouvée. Le monde moderne mesure tout au résultat visible ; l'Évangile parle d'un travail qui n'est jamais vain dans le Seigneur (1 Corinthiens 15:58). Une visite, une offre de service, une prière fidèle peuvent sembler invisibles et peser pourtant plus lourd que des projets bruyants.",
      "L'engagement a aussi une forme communautaire. Une église avance quand des membres prennent des responsabilités concrètes : accueil, intercession, enseignement des enfants, entretien du temple, accompagnement des familles. Chacun reçoit une part.",
      "La récompense ultime n'est pas un prix à décrocher, c'est une présence : entendre un jour : « C'est bien, bon et fidèle serviteur ». Tout le reste est supplément.",
    ],
    quote: {
      text: 'Celui qui s\'approche de Dieu doit croire qu\'il existe et qu\'il récompense ceux qui le cherchent.',
      reference: 'Hébreux 11:6',
    },
  },
  {
    slug: 'premiere-pierre-kakana',
    title: 'Kakana : la première pierre du Centre Évangélique Missionnaire',
    category: 'Événement',
    date: '2025-07-23',
    excerpt:
      "Le dimanche 20 juillet 2025, l'église a posé la première pierre de sa nouvelle extension au village Kakana, à 50 km de Lubumbashi.",
    image: '/church-photo-3.webp',
    source: 'https://web.facebook.com/laconquete.eec',
    body: [
      "Le dimanche 20 juillet 2025, en début d'après-midi, le pasteur Josué Romain Kazadi, représentant légal de la communauté des églises évangéliques La Conquête, a posé la première pierre du Centre Évangélique Missionnaire La Conquête Kakana.",
      "La cérémonie s'est déroulée dans la concession de la nouvelle extension, au village Kakana, à environ 50 km de la ville de Lubumbashi. Elle s'est tenue en présence des pasteurs assistants, des pasteurs des autres extensions, des anciens et diacres, des responsables de départements et de nombreux membres.",
      "Ce geste n'est pas symbolique. Poser une première pierre, dans la Bible, c'est fixer un lieu, nommer une espérance et engager une responsabilité. Kakana n'est pas une antenne lointaine : c'est une terre confiée à la prière et au travail de l'église.",
      "L'événement donne corps à la seconde partie de la vision de La Conquête : « la conquête des terres habitables et cultivables ». Une église s'implante là où des familles vivent, travaillent et doivent entendre l'Évangile dans leur propre langue et leur propre quotidien.",
      "Les photographies de la journée ont été partagées sur la page officielle de l'église. Elles rappellent que derrière chaque extension, il y a des visages, des trajets et des offrandes discrètes.",
      "L'extension de Kakana reste aujourd'hui portée par la prière de toute la communauté. La première pierre est posée ; le chantier, lui, continue dans les cœurs.",
    ],
  },
];

export function readingTime(article: Article): string {
  const words = article.body.join(' ').split(/\s+/).filter(Boolean).length;
  return `${Math.max(2, Math.ceil(words / 200))} min`;
}

export function articleDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function sortArticles(list: Article[]): Article[] {
  return [...list].sort((a, b) => {
    if (!!a.featured !== !!b.featured) return a.featured ? -1 : 1;
    return a.date < b.date ? 1 : -1;
  });
}

export function sortedArticles(): Article[] {
  return sortArticles(ARTICLES);
}

export function toArticle(row: SiteArticle): Article {
  return {
    slug: row.slug,
    title: row.title,
    category: ARTICLE_CATEGORIES.includes(row.category) ? row.category : 'Annonce',
    date: row.published_at.slice(0, 10),
    excerpt: row.excerpt,
    image: row.image_url?.trim() || '/church-photo-1.webp',
    featured: row.is_featured,
    source: row.source_url ?? undefined,
    body: Array.isArray(row.body) ? row.body : [],
    quote: row.quote_text
      ? { text: row.quote_text, reference: row.quote_reference ?? '' }
      : undefined,
  };
}
