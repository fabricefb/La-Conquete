const M = ['Jan','Fév','Mar','Avr','Mai','Jun','Jui','Aoû','Sep','Oct','Nov','Déc'];
export function formatDate(s: string) { const d = new Date(s); return { day: String(d.getDate()).padStart(2,'0'), month: M[d.getMonth()], full: d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}) }; }
export function formatShortDate(s: string) { const d = new Date(s); return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`; }
