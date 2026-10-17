// Transforme la section « Carrousel » en images 1080 × 1350 (charte EJP Tech) + 1 PDF modifiable dans Canva.
// Les 7 slides de Claude + 1 slide finale fixe « Abonne-toi ».
// Entrée : la tâche ClickUp créée juste avant (on lit son id). Sortie : une image par slide + le PDF, chacun sous
// forme de fichier index.html que « 9. Generer les images » envoie à Gotenberg (le moteur de rendu du VPS).

// ---- Réglages de marque (à adapter) ----
const MARQUE = 'EJP Tech';
const COMPTE = ''; // ex. '@ejptech' : affiché sous le nom et sur la slide « Abonne-toi ». Vide = non affiché.
const SIGNATURE = 'On décrypte la tech qui change ton quotidien.';
const COULEURS = { nuit: '#0B1D47', nuit2: '#152C6B', creme: '#FBF6EE', orange: '#FF7A1A', texte: '#0B1D47', gris: '#4A5878' };

const res = $('7. Resultat').first().json;
const tacheId = $input.first().json.id;
if (!tacheId) throw new Error("Pas d'identifiant de tâche ClickUp : ce nœud doit être branché juste après le nœud ClickUp.");

const texte = res.carrousel || '';
const template = ((texte.match(/\*\*Template\*\*\s*:\s*(.+?)\s*(·\s*\*\*Alternative|\n)/) || [])[1] || '').trim();

// Découpe « **Slide N · rôle** » puis les lignes « Texte : », « Accent orange : », « Emoji : », « Visuel : ».
const EMOJI_RE = /\p{Extended_Pictographic}️?/u;
const slides = [];
for (const bloc of texte.split(/\*\*Slide\s+/i).slice(1)) {
  const [entete, ...lignes] = bloc.split('\n');
  const role = (entete.split('·')[1] || '').replace(/\*+/g, '').trim();
  const champ = (nom) => {
    const l = lignes.map((x) => x.replace(/\*/g, '').trim()).find((x) => x.toLowerCase().startsWith(nom));
    return l ? l.slice(l.indexOf(':') + 1).trim() : '';
  };
  const emoji = (champ('emoji').match(EMOJI_RE) || champ('visuel').match(EMOJI_RE) || [''])[0];
  slides.push({ role, texte: champ('texte'), accent: champ('accent'), emoji });
}
if (!slides.length) return []; // format « reel » seul : pas de carrousel à dessiner
const EMOJIS_SECOURS = ['⚡', '🔍', '👀', '⚠️', '💡', '✅', '🎯'];
slides.forEach((s, i) => { s.emoji = s.emoji || EMOJIS_SECOURS[i % EMOJIS_SECOURS.length]; });

const echap = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function surligner(phrase, accent) {
  const p = echap(phrase);
  const a = echap(accent);
  const i = a ? p.toLowerCase().indexOf(a.toLowerCase()) : -1;
  return i < 0 ? p : `${p.slice(0, i)}<mark>${p.slice(i, i + a.length)}</mark>${p.slice(i + a.length)}`;
}
// Titre = première phrase (ou ce qui précède une liste « 1. »), corps = la suite. Listes en lignes séparées.
function decouper(t) {
  const liste = t.search(/(^|\s)1\.\s/);
  if (liste > 0) return [t.slice(0, liste).trim(), t.slice(liste).trim()];
  if (liste === 0) return ['', t];
  const m = t.match(/^(.{12,}?[.?!…])\s+(.+)$/);
  return m ? [m[1], m[2]] : [t, ''];
}
const enLignes = (html) => html.replace(/\s+(\d)\.\s/g, '<br>$1. ').replace(/^(\d)\.\s/, '$1. ').replace(/\s+(À éviter\s*:)/g, '<br><br>$1');

const C = COULEURS;
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800;900&display=block');
@page { size: 1080px 1350px; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 1080px; background: ${C.nuit}; }
.slide { width: 1080px; height: 1350px; position: relative; overflow: hidden; font-family: 'Montserrat', sans-serif;
  padding: 0 96px; display: flex; flex-direction: column; page-break-after: always; }
mark { color: inherit; padding: 0 .08em; margin: 0 -.04em; border-radius: .12em;
  background: linear-gradient(transparent 52%, rgba(255,122,26,.55) 52%, rgba(255,122,26,.55) 90%, transparent 90%); }
.couverture mark { background: linear-gradient(transparent 50%, ${C.orange} 50%, ${C.orange} 92%, transparent 92%); }

/* En-tête « profil » commun */
.profil { display: flex; align-items: center; gap: 22px; padding-top: 84px; }
.avatar { width: 84px; height: 84px; border-radius: 50%; background: ${C.orange}; color: #fff; font-weight: 900;
  font-size: 27px; display: flex; align-items: center; justify-content: center; letter-spacing: -1px; }
.nom { font-weight: 800; font-size: 32px; line-height: 1.1; }
.compte { font-weight: 500; font-size: 25px; opacity: .65; }
.compteur { margin-left: auto; font-weight: 800; font-size: 26px; padding: 12px 24px; border-radius: 40px; }

/* Barre de progression en bas */
.progres { position: absolute; left: 96px; right: 96px; bottom: 72px; height: 10px; border-radius: 10px; }
.progres i { display: block; height: 100%; border-radius: 10px; background: ${C.orange}; }
.suite { position: absolute; right: 96px; bottom: 104px; font-weight: 700; font-size: 26px; opacity: .7; }

/* Couverture */
.couverture { background: radial-gradient(110% 70% at 90% 0%, ${C.nuit2} 0%, ${C.nuit} 60%); color: #fff; }
.couverture .compteur { background: rgba(255,255,255,.12); }
.couverture .progres { background: rgba(255,255,255,.15); }
.couverture .centre { margin: auto 0; }
.couverture .gros-emoji { font-size: 150px; line-height: 1; margin-bottom: 48px; }
.couverture .kicker { color: ${C.orange}; font-weight: 800; font-size: 30px; letter-spacing: 5px; text-transform: uppercase; margin-bottom: 30px; }
.couverture h1 { font-size: 104px; line-height: 1.04; font-weight: 900; letter-spacing: -2px; }
.couverture .swipe { display: inline-flex; margin-top: 64px; background: #fff; color: ${C.nuit}; font-weight: 800;
  font-size: 30px; padding: 22px 38px; border-radius: 60px; }

/* Slides de contenu */
.contenu { background: ${C.creme}; color: ${C.texte}; }
.contenu .compteur { background: ${C.nuit}; color: #fff; }
.contenu .progres { background: rgba(11,29,71,.1); }
.contenu .centre { margin: auto 0; }
.badge { width: 128px; height: 128px; border-radius: 34px; background: #fff; box-shadow: 0 18px 40px rgba(11,29,71,.12);
  display: flex; align-items: center; justify-content: center; font-size: 72px; margin-bottom: 44px; }
.kicker { color: ${C.orange}; font-weight: 800; font-size: 27px; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 26px; }
h2 { font-size: 70px; line-height: 1.1; font-weight: 900; letter-spacing: -1px; }
.corps { font-size: 44px; line-height: 1.36; font-weight: 600; color: ${C.gris}; margin-top: 36px; }
.seul h2 { font-size: 80px; }
.liste .corps { font-size: 54px; line-height: 1.4; font-weight: 800; color: ${C.texte}; margin-top: 0; }
.action.liste .corps { color: #fff; }

/* Slide « à toi de jouer » */
.action { background: ${C.orange}; color: #fff; }
.action .compteur { background: #fff; color: ${C.orange}; }
.action .progres { background: rgba(255,255,255,.3); }
.action .progres i { background: #fff; }
.action .centre { margin: auto 0; }
.action .badge { background: rgba(255,255,255,.18); box-shadow: none; }
.action .kicker { color: ${C.nuit}; }
.action .corps { color: #fff; opacity: .92; }
.action mark { background: linear-gradient(transparent 52%, rgba(11,29,71,.35) 52%, rgba(11,29,71,.35) 90%, transparent 90%); }
.action .avatar { background: ${C.nuit}; }

/* Slide finale « Abonne-toi » */
.abonne { background: radial-gradient(100% 70% at 50% 0%, ${C.nuit2} 0%, ${C.nuit} 65%); color: #fff; align-items: center; text-align: center; justify-content: center; }
.abonne .grand-avatar { width: 230px; height: 230px; border-radius: 50%; background: ${C.orange}; color: #fff; font-weight: 900;
  font-size: 70px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 14px rgba(255,122,26,.25); margin-bottom: 56px; }
.abonne .pre { color: ${C.orange}; font-weight: 800; font-size: 32px; letter-spacing: 3px; text-transform: uppercase; }
.abonne h2 { font-size: 124px; margin: 18px 0 28px; letter-spacing: -3px; }
.abonne .sig { font-size: 40px; font-weight: 600; opacity: .85; max-width: 820px; line-height: 1.35; }
.abonne .bouton { margin-top: 60px; background: ${C.orange}; font-weight: 800; font-size: 38px; padding: 28px 70px; border-radius: 70px; }
.abonne .gestes { margin-top: 64px; display: flex; gap: 44px; font-size: 28px; font-weight: 700; opacity: .8; }
.abonne .compte-final { margin-top: 30px; font-size: 32px; font-weight: 700; opacity: .9; }
`;

const total = slides.length + 1;
const initiales = MARQUE.split(/\s+/)[0].slice(0, 3).toUpperCase();
const profil = (n) => `<div class="profil"><div class="avatar">${initiales}</div>
  <div><div class="nom">${echap(MARQUE)}</div><div class="compte">${echap(COMPTE || 'Décrypte')}</div></div>
  <div class="compteur">${n}/${total}</div></div>`;
const progres = (n) => `<div class="progres"><i style="width:${Math.round((n / total) * 100)}%"></i></div>`;

function slideHtml(s, i) {
  const n = i + 1;
  if (i === 0) {
    return `<section class="slide couverture">${profil(n)}
  <div class="centre"><div class="gros-emoji">${s.emoji}</div><div class="kicker">${echap(MARQUE)} Décrypte</div>
  <h1>${surligner(s.texte, s.accent)}</h1><div class="swipe">Swipe pour comprendre →</div></div>${progres(n)}</section>`;
  }
  const classe = i === slides.length - 1 ? 'action' : 'contenu';
  const [titre, corps] = decouper(s.texte);
  const kicker = i === slides.length - 1 ? 'À toi de jouer' : s.role;
  return `<section class="slide ${classe}${corps ? '' : ' seul'}${titre ? '' : ' liste'}">${profil(n)}
  <div class="centre"><div class="badge">${s.emoji}</div><div class="kicker">${echap(kicker)}</div>
  ${titre ? `<h2>${surligner(titre, s.accent)}</h2>` : ''}
  ${corps ? `<div class="corps">${enLignes(surligner(corps, titre.toLowerCase().includes((s.accent || '').toLowerCase()) ? '' : s.accent))}</div>` : ''}</div>
  ${i < slides.length - 1 ? '<div class="suite">Swipe →</div>' : ''}${progres(n)}</section>`;
}
const slideAbonne = () => `<section class="slide abonne">
  <div class="grand-avatar">${initiales}</div><div class="pre">Tu as appris un truc ?</div><h2>Abonne-toi</h2>
  <div class="sig">${echap(SIGNATURE)}</div><div class="bouton">+ S'abonner</div>
  ${COMPTE ? `<div class="compte-final">${echap(COMPTE)}</div>` : ''}
  <div class="gestes"><span>🔖 Enregistre</span><span>📩 Partage</span><span>💬 Commente</span></div></section>`;

const page = (corps) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${corps}</body></html>`;
const fichier = (html) => ({ data: Buffer.from(html, 'utf8').toString('base64'), mimeType: 'text/html', fileName: 'index.html' });

const base = (res.titre || 'carrousel').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const pages = [...slides.map(slideHtml), slideAbonne()];
const sorties = pages.map((html, i) => ({
  json: { tache_id: tacheId, route: 'screenshot/html', nom: `${base}-slide-${i + 1}.png`, template },
  binary: { index: fichier(page(html)) },
}));
sorties.push({
  json: { tache_id: tacheId, route: 'convert/html', nom: `${base}-carrousel-canva.pdf`, template },
  binary: { index: fichier(page(pages.join(''))) },
});
return sorties;
