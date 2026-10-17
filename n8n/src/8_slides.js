// Transforme la section « Carrousel » en 7 images 1080 × 1350 (charte EJP Tech) + 1 PDF modifiable dans Canva.
// Entrée : la tâche ClickUp créée juste avant (on lit son id). Sortie : 8 éléments, chacun avec un fichier index.html
// que « 9. Generer les images » envoie à Gotenberg (le moteur de rendu installé sur le VPS).
const res = $('7. Resultat').first().json;
const tacheId = $input.first().json.id;
if (!tacheId) throw new Error("Pas d'identifiant de tâche ClickUp : ce nœud doit être branché juste après le nœud ClickUp.");

const texte = res.carrousel || '';
const template = ((texte.match(/\*\*Template\*\*\s*:\s*(.+?)\s*(·\s*\*\*Alternative|\n)/) || [])[1] || '').trim();

// Découpe « **Slide N · rôle** » puis les lignes « Texte : », « Accent orange : ».
const slides = [];
for (const bloc of texte.split(/\*\*Slide\s+/i).slice(1)) {
  const [entete, ...lignes] = bloc.split('\n');
  const role = (entete.split('·')[1] || '').replace(/\*+/g, '').trim();
  const champ = (nom) => {
    const l = lignes.find((x) => x.toLowerCase().replace(/\*/g, '').trim().startsWith(nom));
    return l ? l.replace(/\*/g, '').slice(l.replace(/\*/g, '').indexOf(':') + 1).trim() : '';
  };
  slides.push({ role, texte: champ('texte'), accent: champ('accent') });
}
if (!slides.length) return []; // format « reel » seul : pas de carrousel à dessiner

const echap = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function surligner(phrase, accent) {
  const p = echap(phrase);
  if (!accent) return p;
  const i = p.toLowerCase().indexOf(echap(accent).toLowerCase());
  const html = i < 0 ? p : `${p.slice(0, i)}<em>${p.slice(i, i + accent.length)}</em>${p.slice(i + accent.length)}`;
  // Listes « 1. … 2. … » et « À éviter : » sur des lignes séparées.
  return html.replace(/\s+(\d)\.\s/g, '<br>$1. ').replace(/\s+(À éviter\s*:)/g, '<br>$1');
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;800&display=block');
@page { size: 1080px 1350px; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 1080px; background: #0B1D47; }
.slide { width: 1080px; height: 1350px; position: relative; overflow: hidden; color: #fff;
  font-family: 'Montserrat', sans-serif; background: radial-gradient(120% 80% at 85% 0%, #1B3A8A 0%, #0B1D47 55%, #081536 100%);
  padding: 120px 96px; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
.slide::after { content: ''; position: absolute; right: -140px; bottom: -140px; width: 420px; height: 420px;
  border: 46px solid rgba(255, 122, 26, .16); border-radius: 50%; }
.role { position: absolute; top: 96px; left: 96px; font-size: 30px; font-weight: 700; letter-spacing: 4px;
  text-transform: uppercase; color: #FF7A1A; }
.texte { font-size: 64px; line-height: 1.22; font-weight: 700; max-width: 880px; }
.couverture .texte { font-size: 92px; font-weight: 800; line-height: 1.1; }
.fin .texte { font-size: 70px; }
em { font-style: normal; color: #FF7A1A; }
.bas { position: absolute; left: 96px; right: 96px; bottom: 80px; display: flex; justify-content: space-between;
  align-items: center; font-size: 28px; font-weight: 700; color: rgba(255, 255, 255, .75); z-index: 1; }
.marque b { color: #FF7A1A; }
.points { display: flex; gap: 12px; }
.points i { width: 14px; height: 14px; border-radius: 50%; background: rgba(255, 255, 255, .3); }
.points i.on { background: #FF7A1A; }
.swipe { position: absolute; right: 96px; top: 96px; font-size: 28px; font-weight: 700; color: rgba(255, 255, 255, .75); }
`;

const total = slides.length;
function slideHtml(s, i) {
  const classe = i === 0 ? 'couverture' : i === total - 1 ? 'fin' : '';
  const points = slides.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('');
  return `<section class="slide ${classe}">
  <div class="role">${echap(i === 0 ? 'EJP Tech Décrypte' : s.role)}</div>
  ${i === 0 ? '<div class="swipe">Swipe →</div>' : ''}
  <div class="texte">${surligner(s.texte, s.accent)}</div>
  <div class="bas"><span class="points">${points}</span><span class="marque">EJP <b>Tech</b></span></div>
</section>`;
}
const page = (corps) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${corps}</body></html>`;
const fichier = (html) => ({ data: Buffer.from(html, 'utf8').toString('base64'), mimeType: 'text/html', fileName: 'index.html' });

const base = (res.titre || 'carrousel').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const sorties = slides.map((s, i) => ({
  json: { tache_id: tacheId, route: 'screenshot/html', nom: `${base}-slide-${i + 1}.png`, template },
  binary: { index: fichier(page(slideHtml(s, i))) },
}));
sorties.push({
  json: { tache_id: tacheId, route: 'convert/html', nom: `${base}-carrousel-canva.pdf`, template },
  binary: { index: fichier(page(slides.map(slideHtml).join(''))) },
});
return sorties;
