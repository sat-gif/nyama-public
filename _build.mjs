/**
 * Génère les quatre versions de la page d'accueil à partir d'UNE source.
 *
 *   _src/index.html   la page française, source de vérité
 *   _i18n/<lg>.json   les traductions, repérées par les attributs data-i18n
 *   ->  index.html  en/index.html  de/index.html  es/index.html
 *
 * Lancer après toute modification du texte :  node _build.mjs
 *
 * GitHub Pages n'exécute rien : ce sont les fichiers générés qui sont publiés,
 * il faut donc les committer. Jekyll ignore les dossiers commençant par « _ »,
 * `_src` et `_i18n` ne sont pas servis — c'est voulu.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { markdown, frontmatter, extrait } from './_markdown.mjs';

const ORIGINE = 'https://getnyama.app';

/** Le français n'a pas de fichier de traduction : c'est la source telle quelle. */
const FR = {
  _meta: {
    lang: 'fr',
    locale: 'fr_FR',
    dir: '/',
    title: "Nyama — toutes tes recettes, enfin réunies au même endroit",
    description:
      "Les recettes que tu aimes dorment dans tes favoris Instagram, tes captures d'écran et tes onglets ouverts. Nyama les réunit toutes dans une seule bibliothèque : la tienne.",
    ogTitle: "Nyama — toutes tes recettes, enfin réunies au même endroit",
    ogDescription:
      "Instagram, TikTok, YouTube, un blog, une photo de livre. Tu partages, Nyama range. Ta bibliothèque de recettes, prête à cuisiner.",
  },
};

/**
 * ---- LE SEUL RÉGLAGE À TOUCHER POUR OUVRIR UNE LANGUE ----
 *
 * Les langues RÉELLEMENT publiées. Les traductions des autres dorment dans
 * `_i18n/` : elles sont prêtes, simplement pas mises en ligne.
 *
 * Ajouter un code ici, relancer `node _build.mjs`, committer :
 *   - la page de la langue est générée (/en/, /de/, /es/) ;
 *   - son drapeau apparaît dans le sélecteur ;
 *   - les liens hreflang la déclarent.
 *
 * Tant qu'il n'y a qu'une langue, le sélecteur de drapeaux est retiré de la
 * page — un drapeau seul ne sert à rien — et les hreflang aussi.
 */
const PUBLIEES = ['fr'];

/** Toutes les langues connues, publiées ou non. */
const LANGUES = ['fr', 'en', 'de', 'es'];
const dico = { fr: FR };
for (const lg of LANGUES.filter((l) => l !== 'fr')) {
  dico[lg] = JSON.parse(readFileSync(new URL(`_i18n/${lg}.json`, import.meta.url), 'utf8'));
}

/**
 * Remplace le contenu de l'élément porteur de `data-i18n="cle"`.
 *
 * On ne peut pas se contenter d'une expression régulière paresseuse : un
 * élément peut contenir des balises. On repère donc la balise ouvrante, puis on
 * avance en comptant les ouvertures et fermetures de MÊME nom jusqu'à la
 * fermeture qui correspond.
 */
function remplaceContenu(html, cle, valeur) {
  const ancre = html.indexOf(`data-i18n="${cle}"`);
  if (ancre === -1) return { html, trouve: false };

  const debutBalise = html.lastIndexOf('<', ancre);
  const nom = html.slice(debutBalise + 1).match(/^[a-zA-Z0-9]+/)[0];
  const finOuvrante = html.indexOf('>', ancre) + 1;

  let i = finOuvrante;
  let profondeur = 1;
  const ouvre = new RegExp(`<${nom}[\\s>]`, 'i');
  while (profondeur > 0 && i < html.length) {
    const suivantFerme = html.indexOf(`</${nom}`, i);
    if (suivantFerme === -1) break;
    const tranche = html.slice(i, suivantFerme);
    profondeur += (tranche.match(new RegExp(ouvre, 'gi')) || []).length;
    profondeur -= 1;
    i = suivantFerme + nom.length + 3;
    if (profondeur === 0) {
      return { html: html.slice(0, finOuvrante) + valeur + html.slice(suivantFerme), trouve: true };
    }
  }
  return { html, trouve: false };
}

/** Liens hreflang : chaque version publiée déclare les autres. */
function liensAlternatifs() {
  if (PUBLIEES.length < 2) return '';
  const l = PUBLIEES.map(
    (lg) =>
      `<link rel="alternate" hreflang="${lg}" href="${ORIGINE}${dico[lg]._meta.dir}">`,
  );
  l.push(`<link rel="alternate" hreflang="x-default" href="${ORIGINE}/">`);
  return l.join('\n') + '\n';
}

/**
 * Ne garde dans le sélecteur que les drapeaux des langues publiées, et retire
 * le sélecteur entier s'il n'en reste qu'un — un drapeau seul n'offre aucun
 * choix, il ferait juste croire à un site multilingue qui ne l'est pas encore.
 */
function filtreDrapeaux(html) {
  const debut = html.indexOf('<div class="langs"');
  if (debut === -1) return html;
  // Bornes du conteneur : on repart de son ouverture et on compte les <div>.
  let i = html.indexOf('>', debut) + 1;
  let prof = 1;
  while (prof > 0) {
    const o = html.indexOf('<div', i);
    const f = html.indexOf('</div>', i);
    if (f === -1) break;
    if (o !== -1 && o < f) { prof++; i = o + 4; } else { prof--; i = f + 6; }
  }
  const bloc = html.slice(debut, i);
  const contenu = bloc.slice(bloc.indexOf('>') + 1, bloc.lastIndexOf('</div>'));

  const gardes = [...contenu.matchAll(/<a\s[^>]*hreflang="([a-z]{2})"[\s\S]*?<\/a>/g)]
    .filter((m) => PUBLIEES.includes(m[1]))
    .map((m) => m[0]);

  if (gardes.length < 2) return html.slice(0, debut) + html.slice(i);
  return (
    html.slice(0, debut) +
    bloc.slice(0, bloc.indexOf('>') + 1) +
    '\n        ' + gardes.join('\n        ') + '\n      </div>' +
    html.slice(i)
  );
}

/* ------------------------------------------------------------------
   BLOG
   Les articles vivent en Markdown dans `_blog/`. Le nom du fichier donne
   l'adresse : `_blog/ranger-ses-recettes.md` → `/blog/ranger-ses-recettes/`.
   Un article avec `draft: true` dans son entête n'est pas publié.
   ------------------------------------------------------------------ */

const MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const dateLisible = (iso) => {
  const [a, m, j] = iso.split('-').map(Number);
  return `${j} ${MOIS[m - 1]} ${a}`;
};
const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function lisArticles() {
  const dir = new URL('_blog/', import.meta.url);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const brut = readFileSync(new URL(f, dir), 'utf8');
      const { meta, corps } = frontmatter(brut);
      const html = markdown(corps);
      return {
        slug: f.replace(/\.md$/, ''),
        titre: meta.title || f.replace(/\.md$/, ''),
        date: meta.date || '',
        description: meta.description || extrait(html),
        brouillon: meta.draft === 'true',
        html,
      };
    })
    .filter((a) => {
      if (a.brouillon) return false;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date)) {
        console.log(`  ⚠ ${a.slug} : date manquante ou mal formée (attendu AAAA-MM-JJ) — non publié`);
        return false;
      }
      return true;
    })
    .sort((x, y) => (x.date < y.date ? 1 : -1));
}

/**
 * Coquille commune aux pages du blog : on RÉUTILISE la feuille de style, l'entête
 * et le pied de page de la page d'accueil déjà générée, pour qu'il n'y ait jamais
 * deux designs à tenir. Les ancres du menu (#comment…) sont repréfixées, sinon
 * elles ne mènent nulle part depuis /blog/.
 */
function coquille({ accueil, titre, description, url, corps, ogImage }) {
  const styles = accueil.match(/<style>[\s\S]*?<\/style>/)[0];
  const entete = accueil.match(/<header class="nav"[\s\S]*?<\/header>/)[0]
    .replace(/href="#/g, 'href="/#');
  const pied = accueil.match(/<footer class="site">[\s\S]*?<\/footer>/)[0];
  const image = ogImage || `${ORIGINE}/assets/ecran-accueil.png`;
  return `<!DOCTYPE html>
<!-- FICHIER GÉNÉRÉ — ne pas modifier à la main.
     Source : _blog/*.md + _src/index.html, puis « node _build.mjs ». -->
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${attr(titre)}</title>
<meta name="description" content="${attr(description)}">
<link rel="canonical" href="${url}">
<link rel="icon" href="/assets/icone.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/icone.png">
<meta name="theme-color" content="#FCAE0B">
<link rel="alternate" type="application/rss+xml" title="Le blog de Nyama" href="${ORIGINE}/blog/feed.xml">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Nyama">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${attr(titre)}">
<meta property="og:description" content="${attr(description)}">
<meta property="og:image" content="${image}">
<meta property="og:locale" content="fr_FR">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap" rel="stylesheet">
${styles}
</head>
<body>
${entete}
<main>
${corps}
</main>
${pied}
<script>
const nav = document.getElementById('nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 8), { passive: true });
const an = document.getElementById('an');
if (an) an.textContent = new Date().getFullYear();
</script>
</body>
</html>
`;
}

function construisBlog(accueil, articles) {
  mkdirSync(new URL('blog/', import.meta.url), { recursive: true });

  // 1. La liste
  const cartes = articles
    .map(
      (a) => `        <a class="post-card" href="/blog/${a.slug}/">
          <span class="post-date">${dateLisible(a.date)}</span>
          <h2>${attr(a.titre)}</h2>
          <p>${attr(a.description)}</p>
          <span class="post-more">Lire</span>
        </a>`,
    )
    .join('\n');

  const liste = `  <section class="blog-head">
    <div class="wrap">
      <p class="eyebrow">Le blog</p>
      <h1>Bien manger sans y passer ses soirées</h1>
      <p class="lead">Des idées pour retrouver, organiser et cuisiner ce qui te fait envie.</p>
    </div>
  </section>
  <section class="features" style="padding-top:0">
    <div class="wrap">
${articles.length
      ? `      <div class="blog-list">\n${cartes}\n      </div>`
      : `      <p class="blog-vide">Les premiers articles arrivent bientôt.</p>`}
    </div>
  </section>`;

  writeFileSync(
    new URL('blog/index.html', import.meta.url),
    coquille({
      accueil,
      titre: 'Le blog de Nyama',
      description: 'Des idées pour retrouver, organiser et cuisiner les recettes qui te font envie.',
      url: `${ORIGINE}/blog/`,
      corps: liste,
    }),
  );

  // 2. Un dossier par article
  for (const a of articles) {
    mkdirSync(new URL(`blog/${a.slug}/`, import.meta.url), { recursive: true });
    const corps = `  <article class="article">
    <div class="wrap article-inner">
      <a class="retour" href="/blog/">Tous les articles</a>
      <span class="post-date">${dateLisible(a.date)}</span>
      <h1>${attr(a.titre)}</h1>
      <p class="chapeau">${attr(a.description)}</p>
      <div class="article-corps">
${a.html}
      </div>
    </div>
    <div class="wrap">
      <div class="article-cta">
        <h2>Toutes tes recettes, au même endroit</h2>
        <p>Nyama range ce que tu croises sur Instagram, TikTok ou un blog dans une seule bibliothèque. La tienne.</p>
        <a class="btn btn-primary" href="/#telecharger">Découvrir Nyama</a>
      </div>
    </div>
  </article>`;
    writeFileSync(
      new URL(`blog/${a.slug}/index.html`, import.meta.url),
      coquille({
        accueil,
        titre: `${a.titre} — Nyama`,
        description: a.description,
        url: `${ORIGINE}/blog/${a.slug}/`,
        corps,
      }),
    );
  }

  // 3. Le flux RSS
  const items = articles
    .map(
      (a) => `    <item>
      <title>${attr(a.titre)}</title>
      <link>${ORIGINE}/blog/${a.slug}/</link>
      <guid isPermaLink="true">${ORIGINE}/blog/${a.slug}/</guid>
      <pubDate>${new Date(`${a.date}T09:00:00Z`).toUTCString()}</pubDate>
      <description>${attr(a.description)}</description>
    </item>`,
    )
    .join('\n');
  writeFileSync(
    new URL('blog/feed.xml', import.meta.url),
    `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
    <title>Le blog de Nyama</title>
    <link>${ORIGINE}/blog/</link>
    <description>Des idées pour retrouver, organiser et cuisiner les recettes qui te font envie.</description>
    <language>fr-FR</language>
${items}
  </channel>
</rss>
`,
  );

  console.log(
    `blog/           ${articles.length} article${articles.length > 1 ? 's' : ''} + flux RSS`,
  );
}

const articles = lisArticles();
const source = readFileSync(new URL('_src/index.html', import.meta.url), 'utf8');
let total = 0;
let accueilFr = '';

for (const lg of PUBLIEES) {
  const t = dico[lg];
  const m = t._meta;
  let html = source;
  let manquantes = [];

  // 1. Les textes.
  if (lg !== 'fr') {
    const cles = [...new Set([...source.matchAll(/data-i18n="([^"]+)"/g)].map((x) => x[1]))];
    for (const cle of cles) {
      const valeur = t[cle];
      if (valeur === undefined) { manquantes.push(cle); continue; }
      // Une même clé peut servir à plusieurs endroits (les deux boutons App Store).
      let encore = true;
      while (encore) {
        const r = remplaceContenu(html, cle, valeur);
        html = r.html;
        // On neutralise l'attribut déjà traité pour passer au suivant.
        if (r.trouve) html = html.replace(`data-i18n="${cle}"`, `data-done="${cle}"`);
        else encore = false;
      }
    }
    html = html.replace(/data-done="/g, 'data-i18n="');
  }

  // 2. L'entête du document.
  html = html.replace('<html lang="fr">', `<html lang="${m.lang}">`);
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${m.title}</title>`,
  );
  html = html.replace(
    /(<meta name="description" content=")[^"]*(">)/,
    `$1${m.description}$2`,
  );
  html = html.replace(
    /(<link rel="canonical" href=")[^"]*(">)/,
    `$1${ORIGINE}${m.dir}$2`,
  );
  html = html.replace(
    /(<meta property="og:url" content=")[^"]*(">)/,
    `$1${ORIGINE}${m.dir}$2`,
  );
  html = html.replace(
    /(<meta property="og:title" content=")[^"]*(">)/,
    `$1${m.ogTitle}$2`,
  );
  html = html.replace(
    /(<meta property="og:description" content=")[^"]*(">)/,
    `$1${m.ogDescription}$2`,
  );
  html = html.replace(
    /(<meta property="og:locale" content=")[^"]*(">)/,
    `$1${m.locale}$2`,
  );
  html = html.replace('</head>', `${liensAlternatifs()}\n</head>`);

  // 3. Le sélecteur de langue : on ne garde que les langues publiées, puis on
  //    marque celle de la page.
  html = html.replace(' aria-current="true"', '');
  html = filtreDrapeaux(html);
  html = html.replace(
    `<a href="${m.dir}" hreflang="${m.lang}"`,
    `<a href="${m.dir}" hreflang="${m.lang}" aria-current="true"`,
  );

  // 4. Le lien « Blog » (menu ET pied de page) ne sert que s'il y a quelque
  //    chose à lire. `/g` : il y a DEUX occurrences depuis que le pied de
  //    page a sa propre colonne de liens — sans le drapeau global, seule la
  //    première (le menu) aurait été retirée et l'autre serait restée.
  if (!articles.length) {
    html = html.replace(/\s*<a href="\/blog\/" data-lien-blog[^>]*>[^<]*<\/a>/g, '');
  } else {
    html = html.replace(/ data-lien-blog/g, '');
  }

  // 5. Bandeau « fichier généré » pour qui ouvrirait la sortie par erreur.
  html = html.replace(
    '<!DOCTYPE html>',
    `<!DOCTYPE html>\n<!-- FICHIER GÉNÉRÉ — ne pas modifier à la main.\n     Source : _src/index.html + _i18n/*.json, puis « node _build.mjs ». -->`,
  );

  const chemin = lg === 'fr' ? 'index.html' : `${lg}/index.html`;
  if (lg !== 'fr') mkdirSync(new URL(`${lg}/`, import.meta.url), { recursive: true });
  writeFileSync(new URL(chemin, import.meta.url), html);
  // Le blog emprunte à la page française sa feuille de style, son entête et
  // son pied de page : un seul design à tenir.
  if (lg === 'fr') accueilFr = html;

  const restantes = (html.match(/data-i18n="/g) || []).length;
  console.log(
    `${chemin.padEnd(16)} ${restantes} clés` +
      (manquantes.length ? `  ⚠ traductions manquantes : ${manquantes.join(', ')}` : ''),
  );
  total += manquantes.length;
}

construisBlog(accueilFr, articles);

console.log(total === 0 ? '\nToutes les clés sont traduites.' : `\n${total} traductions manquantes.`);
