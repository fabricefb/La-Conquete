import {
  Facebook, Youtube, Instagram, MessageCircle, Music, Twitter, Linkedin, Send, Megaphone,
  type LucideIcon,
} from './icons';
import { CHURCH, churchSetting } from './church';
import { YOUTUBE_CHANNEL } from './teachings';

/* Réseaux sociaux officiels — une seule liste pour le footer, la page
   Contact, les blocs « Nos canaux » et le back-office. Les comptes réels
   servent de repli ; les réseaux non encore ouverts restent masqués tant
   qu'aucune URL n'est saisie dans Paramètres → Réseaux sociaux. */
export interface SocialNetwork {
  key: string;
  label: string;
  Icon: LucideIcon;
  fallback: string;
  hint: string;
  /* Cartes « Nos canaux » (Médias, Prédications) */
  title?: string;
  handle?: string;
  description?: string;
  featured?: boolean;
}

export const SOCIAL_NETWORKS: SocialNetwork[] = [
  {
    key: 'facebook_url',
    label: 'Facebook',
    Icon: Facebook,
    fallback: CHURCH.social.facebook,
    hint: 'https://facebook.com/…',
    title: 'La page officielle',
    handle: '@laconquete.eec',
    description: 'Les directs, les albums photos et les annonces.',
    featured: true,
  },
  {
    key: 'instagram_url',
    label: 'Instagram',
    Icon: Instagram,
    fallback: CHURCH.social.instagram,
    hint: 'https://instagram.com/…',
    title: 'Le quotidien de l’église',
    handle: '@laconquete_eec',
    description: 'La vie de l’église au quotidien.',
    featured: true,
  },
  {
    key: 'youtube_url',
    label: 'YouTube',
    Icon: Youtube,
    fallback: YOUTUBE_CHANNEL.url,
    hint: 'https://youtube.com/@…',
    title: 'La chaîne officielle',
    handle: YOUTUBE_CHANNEL.handle,
    description: 'Prédications, cultes et enseignements en vidéo.',
    featured: true,
  },
  {
    key: 'whatsapp_url',
    label: 'WhatsApp',
    Icon: MessageCircle,
    fallback: `https://wa.me/${CHURCH.phone.href.replace(/\D/g, '')}`,
    hint: 'https://wa.me/243…',
    title: 'Nous écrire',
    handle: 'Message direct',
    description: 'Une question ou un besoin de prière : écrivez-nous.',
  },
  {
    key: 'whatsapp_channel_url',
    label: 'Canal WhatsApp',
    Icon: Megaphone,
    fallback: '',
    hint: 'https://whatsapp.com/channel/…',
    title: 'La Conquête Channel',
    handle: 'Canal de diffusion',
    description: 'Annonces, rappels et vie de l’église au quotidien.',
    featured: true,
  },
  {
    key: 'tiktok_url',
    label: 'TikTok',
    Icon: Music,
    fallback: '',
    hint: 'https://tiktok.com/@…',
    title: 'Les formats courts',
    description: 'Les temps forts de l’église en vidéo courte.',
    featured: true,
  },
  {
    key: 'x_url',
    label: 'X (Twitter)',
    Icon: Twitter,
    fallback: '',
    hint: 'https://x.com/…',
  },
  {
    key: 'linkedin_url',
    label: 'LinkedIn',
    Icon: Linkedin,
    fallback: '',
    hint: 'https://linkedin.com/company/…',
  },
  {
    key: 'telegram_url',
    label: 'Telegram',
    Icon: Send,
    fallback: '',
    hint: 'https://t.me/…',
  },
];

export interface SocialLink {
  key: string;
  href: string;
  label: string;
  title: string;
  handle: string;
  description: string;
  featured: boolean;
  Icon: LucideIcon;
}

export function visibleSocialLinks(settingsMap: Record<string, string>): SocialLink[] {
  return SOCIAL_NETWORKS
    .map(({ key, label, Icon, fallback, title, handle, description, featured }) => ({
      key,
      href: churchSetting(settingsMap, key, fallback).trim(),
      label,
      title: title ?? label,
      handle: handle ?? '',
      description: description ?? '',
      featured: featured === true,
      Icon,
    }))
    .filter((link) => link.href);
}

/* Canaux mis en avant sur les pages Médias et Prédications. TikTok et le
   canal WhatsApp n'apparaissent qu'une fois leur URL saisie au back-office. */
export function featuredSocialLinks(settingsMap: Record<string, string>): SocialLink[] {
  return visibleSocialLinks(settingsMap).filter((link) => link.featured);
}
