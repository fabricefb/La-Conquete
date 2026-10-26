export interface ExtensionCard {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  service_times: string | null;
  pastor_name: string | null;
  is_main: boolean;
  is_active: boolean;
  sort_order: number;
  image_url?: string | null;
  description?: string | null;
}

/* Seule extension publiée avec des faits vérifiés à ce jour.
   Les autres fiches arrivent de la table `locations`, alimentée depuis
   l'onglet « Lieux & extensions » du back-office. */
export const KAKANA: ExtensionCard = {
  id: 'kakana',
  name: 'Centre Évangélique Missionnaire La Conquête Kakana',
  address: 'Village Kakana',
  city: 'Kakana',
  country: 'RD Congo',
  latitude: null,
  longitude: null,
  phone: null,
  service_times: null,
  pastor_name: null,
  is_main: false,
  is_active: true,
  sort_order: 0,
  image_url: '/teachings/kakana.jpg',
  description: null,
};
