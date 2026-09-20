// Configurazione globale del sito e identità editoriale
export const SITE_BRAND = 'Il collante';
export const SITE_TITLE = 'Il collante · Alessandro Caliciotti';
export const SITE_TAGLINE = "Disegno l'architettura. L'IA scrive il codice.";
export const SITE_SUBTITLE = 'Appunti da un integratore di sistemi: energia, ottimizzazione, ESP32, protocolli, e come far lavorare insieme sistemisti e sviluppatori.';
export const SITE_DESCRIPTION = SITE_SUBTITLE;
export const SITE_AUTHOR = 'Alessandro Caliciotti';

export const SOCIAL_LINKS = {
  github: 'https://github.com/alessandrocaliciotti',
  linkedin: 'https://www.linkedin.com/in/alessandro-caliciotti',
  email: 'mailto:alessandro.caliciotti@example.com',
};

export const NAVIGATION_LINKS = [
  { name: 'Articoli', href: '/blog' },
  { name: 'Progetti', href: '/projects' },
  { name: 'Chi scrive', href: '/about' },
];

export const CATEGORIES = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'energia', label: 'Energia', class: 'c-energia' },
  { id: 'ottim', label: 'Ottimizzazione', class: 'c-ottim' },
  { id: 'proto', label: 'Protocolli ed embedded', class: 'c-proto' },
  { id: 'sist', label: 'Sistemi e IA', class: 'c-sist' },
];
