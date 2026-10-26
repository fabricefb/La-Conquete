export interface GalleryPhoto {
  src: string;
  alt: string;
  caption: string;
}

/* Galerie de secours, servie tant que la table media_items est vide.
   Les mêmes photos alimentent l'onglet Médias du back-office local. */
export const DEFAULT_GALLERY: GalleryPhoto[] = [
  { src: '/church-photo-1.webp', alt: "Assemblée de l'Église La Conquête", caption: 'Assemblée dominicale' },
  { src: '/church-photo-2.webp', alt: 'Moment de prière', caption: 'Moment de prière' },
  { src: '/church-photo-3.webp', alt: "Assemblée de l'Église La Conquête", caption: "Rencontre de l'église" },
  { src: '/predication-1.webp', alt: 'Prédication', caption: 'Prédication' },
  { src: '/priere.webp', alt: 'Prière', caption: 'Prière' },
  { src: '/bible.webp', alt: 'Étude biblique', caption: 'Étude biblique' },
];
