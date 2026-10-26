import {
  Facebook, Youtube, Instagram, MessageCircle, Music, Twitter, Linkedin, Send,
  type LucideIcon,
} from './icons';
import { CHURCH, churchSetting } from './church';
import { YOUTUBE_CHANNEL } from './teachings';

/* Réseaux sociaux officiels — une seule liste pour le footer, la page
   Contact et le back-office. Les comptes réels servent de repli ; les
   réseaux non encore ouverts restent masqués tant qu'aucune URL n'est
   saisie dans Paramètres → Réseaux sociaux. */
export interface SocialNetwork {
  key: string;
  label: string;
  Icon: LucideIcon;
  fallback: string;
  hint: string;
}

export const SOCIAL_NETWORKS: SocialNetwork[] = [
  {
    key: 'facebook_url',
    label: 'Facebook',
    Icon: Facebook,
    fallback: CHURCH.social.facebook,
    hint: 'https://facebook.com/…',
  },
  {
    key: 'instagram_url',
    label: 'Instagram',
    Icon: Instagram,
    fallback: CHURCH.social.instagram,
    hint: 'https://instagram.com/…',
  },
  {
    key: 'youtube_url',
    label: 'YouTube',
    Icon: Youtube,
    fallback: YOUTUBE_CHANNEL.url,
    hint: 'https://youtube.com/@…',
  },
  {
    key: 'whatsapp_url',
    label: 'WhatsApp',
    Icon: MessageCircle,
    fallback: `https://wa.me/${CHURCH.phone.href.replace(/\D/g, '')}`,
    hint: 'https://wa.me/243…',
  },
  {
    key: 'tiktok_url',
    label: 'TikTok',
    Icon: Music,
    fallback: '',
    hint: 'https://tiktok.com/@…',
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
  href: string;
  label: string;
  Icon: LucideIcon;
}

export function visibleSocialLinks(settingsMap: Record<string, string>): SocialLink[] {
  return SOCIAL_NETWORKS
    .map(({ key, label, Icon, fallback }) => ({
      href: churchSetting(settingsMap, key, fallback),
      label,
      Icon,
    }))
    .filter((link) => link.href);
}
