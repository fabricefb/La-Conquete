import {
  Facebook, Youtube, Instagram, Twitter, MessageCircle, Globe, Mail, Phone, Play,
  type LucideIcon,
} from './icons';
import type { Pastor, PastorSocialLinks } from '../types';

/* Utilitaires partagés entre la page Équipe pastorale, le tiroir de fiche
   et le dossier autonome. */

export interface PastorLink {
  key: string;
  href: string;
  label: string;
  Icon: LucideIcon;
}

const SOCIAL_META: { key: keyof PastorSocialLinks; label: string; Icon: LucideIcon }[] = [
  { key: 'facebook', label: 'Facebook', Icon: Facebook },
  { key: 'youtube', label: 'YouTube', Icon: Youtube },
  { key: 'instagram', label: 'Instagram', Icon: Instagram },
  { key: 'twitter', label: 'X', Icon: Twitter },
  { key: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle },
  { key: 'website', label: 'Site web', Icon: Globe },
  { key: 'email', label: 'Email', Icon: Mail },
];

export function withProtocol(value: string): string {
  const v = value.trim();
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

function whatsappHref(value: string): string {
  const v = value.trim();
  if (/^https?:\/\//i.test(v)) return v;
  return `https://wa.me/${v.replace(/\D/g, '')}`;
}

export function pastorLinks(pastor: Pastor): PastorLink[] {
  const socials = pastor.social_links || {};
  const links: PastorLink[] = [];

  for (const social of SOCIAL_META) {
    const raw = socials[social.key];
    if (!raw || !raw.trim()) continue;
    const href = social.key === 'email'
      ? (raw.includes('@') ? `mailto:${raw.trim().replace(/^mailto:/i, '')}` : withProtocol(raw))
      : social.key === 'whatsapp'
        ? whatsappHref(raw)
        : withProtocol(raw);
    links.push({ key: social.key, href, label: `${social.label} de ${pastor.name}`, Icon: social.Icon });
  }

  if (pastor.email && !links.some((l) => l.key === 'email')) {
    links.push({ key: 'email', href: `mailto:${pastor.email.trim()}`, label: `Email de ${pastor.name}`, Icon: Mail });
  }
  if (pastor.phone) {
    links.push({ key: 'phone', href: `tel:${pastor.phone.replace(/[^\d+]/g, '')}`, label: `Téléphone de ${pastor.name}`, Icon: Phone });
  }
  if (pastor.video_url && pastor.video_url.trim()) {
    links.push({ key: 'video', href: withProtocol(pastor.video_url), label: `Vidéo de ${pastor.name}`, Icon: Play });
  }

  return links;
}

export function isExternal(href: string): boolean {
  return !/^(mailto:|tel:)/i.test(href);
}

export function linkLabel(link: PastorLink): string {
  return link.label.replace(/\s+de\s+.*$/, '');
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'LC';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function pastorSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function findPastorBySlug(pastors: Pastor[], slug: string): Pastor | undefined {
  return pastors.find((p) => pastorSlug(p.name) === slug);
}

export function mediaHost(url: string): string {
  try {
    return new URL(withProtocol(url)).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
