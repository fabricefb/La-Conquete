export interface Teaching {
  id: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
  videoUrl: string;
}

export const YOUTUBE_CHANNEL = {
  label: 'Église Évangélique La Conquête',
  handle: '@LaconqueteEEC',
  url: 'https://www.youtube.com/@LaconqueteEEC',
} as const;

/* Dernières publications de la chaîne officielle, relevées le 25 octobre 2026. */
export const RECENT_TEACHINGS: readonly Teaching[] = [
  {
    id: 'hEzJBkhksdo',
    title: "L'Idolâtrie",
    publishedAt: '2026-07-23',
    thumbnail: '/teachings/idolatrie.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=hEzJBkhksdo',
  },
  {
    id: '7Oi-G9k04q8',
    title: 'Culte de jeûne et prière',
    publishedAt: '2026-02-14',
    thumbnail: '/teachings/jeune-priere.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=7Oi-G9k04q8',
  },
  {
    id: 'UQgctX20bVg',
    title: 'Culte',
    publishedAt: '2026-02-13',
    thumbnail: '/teachings/culte.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=UQgctX20bVg',
  },
  {
    id: 'bIoo30WtXSI',
    title: 'Culte dominical',
    publishedAt: '2026-02-01',
    thumbnail: '/teachings/culte-dominical.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=bIoo30WtXSI',
  },
  {
    id: '4NX4zHW3mKQ',
    title: 'Culte inaugural à la Conquête Kakana',
    publishedAt: '2026-01-19',
    thumbnail: '/teachings/kakana.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=4NX4zHW3mKQ',
  },
  {
    id: 'A0rEEdemnuQ',
    title: "Les caractéristiques d'une église locale qui réussit sa mission face au monde moderne",
    publishedAt: '2026-01-15',
    thumbnail: '/teachings/eglise-locale.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=A0rEEdemnuQ',
  },
];
