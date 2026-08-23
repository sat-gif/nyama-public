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
    // ≤ 155 caractères : Google tronque au-delà (~160), et l'ancienne version
    // à 175 se faisait couper au milieu d'une phrase dans les résultats.
    description:
      "Les recettes que tu croises sur Instagram, TikTok, YouTube ou un blog, réunies dans une seule bibliothèque sur ton iPhone. Tu partages, Nyama range.",
    // Majuscule après le tiret, contrairement à `title` : iMessage (et d'autres
    // aperçus de lien) retirent le préfixe « Nyama — » de og:title quand un
    // og:site_name existe déjà, pour ne pas le répéter. Ce qui reste doit donc
    // se lire seul, seule sa propre lettre de tête décide s'il a l'air fini
    // ou coupé au milieu — vu chez Sat le 28/07 (capture iMessage).
    ogTitle: "Nyama — Toutes tes recettes, enfin réunies au même endroit",
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
const PUBLIEES = ['fr', 'en', 'de', 'es'];

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

/* ------------------------------------------------------------------
   DONNÉES STRUCTURÉES (JSON-LD)
   Le seul format que les moteurs — Google comme les moteurs IA (GPTBot,
   ClaudeBot, PerplexityBot…) — lisent sans exécuter de JavaScript ni
   interpréter le ton de la page. Trois blocs par langue :
     - MobileApplication : ce qu'EST Nyama (plateforme, lien App Store,
       gratuit au téléchargement) ;
     - Organization : qui la publie ;
     - FAQPage : les questions/réponses, extraites de la page GÉNÉRÉE pour
       que chaque langue emporte les siennes sans doubler les textes.
   ------------------------------------------------------------------ */

const APPSTORE_URL = 'https://apps.apple.com/app/id6794365868';

/** Retire les balises d'un fragment HTML et retasse les blancs. */
const texteNu = (h) =>
  h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').replace(/ ([.,;:)])/g, '$1').trim();

function donneesStructurees(html, m) {
  const blocs = [];

  blocs.push({
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: 'Nyama',
    url: `${ORIGINE}${m.dir}`,
    description: m.description,
    operatingSystem: 'iOS',
    applicationCategory: 'LifestyleApplication',
    image: `${ORIGINE}/assets/og-image.png`,
    installUrl: APPSTORE_URL,
    inLanguage: ['fr', 'en', 'es', 'de', 'pt'],
    // Le téléchargement est gratuit ; l'abonnement Nyama Plus est vendu DANS
    // l'app et son prix varie par pays — on n'affirme ici que le certain.
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    author: { '@type': 'Organization', name: 'Winstell', url: `${ORIGINE}/` },
  });

  blocs.push({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Winstell',
    url: `${ORIGINE}/`,
    logo: `${ORIGINE}/assets/icone.png`,
    email: 'support@getnyama.app',
    sameAs: [APPSTORE_URL],
  });

  // Les paires question/réponse de l'accordéon, dans la langue de la page.
  const paires = [...html.matchAll(
    /<summary[^>]*>([\s\S]*?)<\/summary>\s*<p[^>]*>([\s\S]*?)<\/p>/g,
  )].map(([, q, r]) => ({
    '@type': 'Question',
    name: texteNu(q),
    acceptedAnswer: { '@type': 'Answer', text: texteNu(r) },
  }));
  if (paires.length) {
    blocs.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: paires });
  }

  return blocs
    .map((b) => `<script type="application/ld+json">${JSON.stringify(b)}</script>`)
    .join('\n') + '\n';
}

/* ------------------------------------------------------------------
   robots.txt + sitemap.xml
   Le robots.txt est le premier fichier que demandent les robots — le nôtre
   répondait 404. Le sitemap déclare les pages indexables et leurs versions
   linguistiques ; les pages en noindex (support, conditions, confidentialité,
   et le blog tant qu'il est vide) n'y figurent pas, ce serait contradictoire.
   ------------------------------------------------------------------ */
function construisRobotsEtSitemap(articles) {
  writeFileSync(
    new URL('robots.txt', import.meta.url),
    `User-agent: *\nAllow: /\n\nSitemap: ${ORIGINE}/sitemap.xml\n`,
  );

  // llms.txt — le pendant du robots.txt pour les moteurs IA (llmstxt.org) :
  // un résumé en Markdown, à la racine, qu'ils lisent sans parser le HTML.
  // Bilingue fr/en : les questions arrivent dans les deux langues.
  const articlesMd = articles.length
    ? '\n## Blog\n\n' + articles.map((a) => `- [${a.titre}](${ORIGINE}/blog/${a.slug}/) : ${a.description}`).join('\n') + '\n'
    : '';
  writeFileSync(
    new URL('llms.txt', import.meta.url),
    `# Nyama

> Nyama est une application iPhone qui importe une recette depuis un lien, une vidéo ou une photo (Instagram, TikTok, YouTube et Shorts, Facebook, Pinterest, blogs et sites de cuisine, photo d'une page de livre, texte collé), et la range dans une bibliothèque personnelle : ingrédients d'un côté, étapes de l'autre. Gratuite pour commencer (5 recettes ajoutées par semaine) ; l'abonnement Nyama Plus débloque tout — 4,99 €/mois ou 34,99 €/an (prix France, ajusté selon le pays). iPhone (iOS) uniquement, pas encore sur Android. Interface en français, anglais, espagnol, allemand et portugais. Éditeur : Winstell.

> Nyama is an iPhone app that imports a recipe from a link, a video or a photo (Instagram, TikTok, YouTube and Shorts, Facebook, Pinterest, cooking blogs and websites, a photo of a cookbook page, pasted text), and files it in a personal library: ingredients on one side, steps on the other. Free to start (5 recipes added per week); the Nyama Plus subscription unlocks everything — €4.99/month or €34.99/year (France pricing, adjusted per country). iPhone (iOS) only, not on Android yet. Interface in French, English, Spanish, German and Portuguese. Publisher: Winstell.

L'app comprend aussi : liste de courses rangée par rayon, planification des repas avec rappels, mode cuisine pas-à-pas (écran toujours allumé, quantités ajustées au nombre de personnes), partage de recettes par lien, signalement des allergènes déclarés, adaptation de recettes et estimation des calories (Plus), widgets d'écran d'accueil et verrouillé, lecture hors ligne. Les recettes vivent sur le téléphone ; pas de fil social, pas de revente de données.

## Pages

- [Accueil (français)](${ORIGINE}/) : présentation complète, FAQ, fiche produit
- [Home (English)](${ORIGINE}/en/)
- [Startseite (Deutsch)](${ORIGINE}/de/)
- [Inicio (español)](${ORIGINE}/es/)
- [Assistance](${ORIGINE}/assistance/) : support, résiliation, suppression de compte
- [Politique de confidentialité](${ORIGINE}/confidentialite/)
- [Télécharger sur l'App Store](${APPSTORE_URL})
${articlesMd}`,
  );

  const jour = new Date().toISOString().slice(0, 10);
  const alternates = PUBLIEES.map(
    (lg) =>
      `    <xhtml:link rel="alternate" hreflang="${lg}" href="${ORIGINE}${dico[lg]._meta.dir}"/>`,
  )
    .concat(`    <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGINE}/"/>`)
    .join('\n');

  const urls = [];
  for (const lg of PUBLIEES) {
    urls.push(`  <url>\n    <loc>${ORIGINE}${dico[lg]._meta.dir}</loc>\n${alternates}\n    <lastmod>${jour}</lastmod>\n  </url>`);
  }
  urls.push(`  <url>\n    <loc>${ORIGINE}/assistance/</loc>\n  </url>`);
  if (articles.length) {
    urls.push(`  <url>\n    <loc>${ORIGINE}/blog/</loc>\n    <lastmod>${articles[0].date}</lastmod>\n  </url>`);
    for (const a of articles) {
      urls.push(`  <url>\n    <loc>${ORIGINE}/blog/${a.slug}/</loc>\n    <lastmod>${a.date}</lastmod>\n  </url>`);
    }
  }

  writeFileSync(
    new URL('sitemap.xml', import.meta.url),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`,
  );

  console.log(`robots.txt + sitemap.xml (${urls.length} adresses)`);
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

/**
 * Jeton de campagne « ct » d'un lien App Store : c'est lui qui apparaît dans
 * App Store Connect › Analyses › Acquisition. Apple n'y accepte ni accent, ni
 * espace, ni ponctuation, et tronque au-delà de 40 caractères — on normalise
 * donc ici plutôt que de découvrir des lignes vides dans le rapport.
 */
const jetonCampagne = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 40)
    .replace(/^_|_$/g, '');

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
function coquille({ accueil, titre, description, url, corps, ogImage, ct = 'site', noindex = false, jsonld = '' }) {
  const styles = accueil.match(/<style>[\s\S]*?<\/style>/)[0];
  const entete = accueil.match(/<header class="nav"[\s\S]*?<\/header>/)[0]
    .replace(/href="#/g, 'href="/#');
  const pied = accueil.match(/<footer class="site">[\s\S]*?<\/footer>/)[0];
  // Le bloc App Store voyage tel quel : l'Apple ID et le jeton de fournisseur
  // ne vivent qu'à un seul endroit, `_src/index.html`, accueil comme blog.
  const appstore = accueil.match(/<script id="appstore">[\s\S]*?<\/script>/)?.[0] ?? '';
  // Image dédiée au partage (1200×630) : la même que la page d'accueil, pas
  // la capture verticale du héros — voir le commentaire sur og:image dans
  // _src/index.html.
  const image = ogImage || `${ORIGINE}/assets/og-image.png`;
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
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="fr_FR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${image}">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}${jsonld}${styles}
</head>
<body data-ct="${attr(ct)}">
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
${appstore}
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
      ct: 'blog_liste',
      // Une liste vide est une page vide : on demande aux moteurs de
      // l'ignorer tant qu'il n'y a rien à lire. Le drapeau tombe tout seul
      // au premier article publié.
      noindex: articles.length === 0,
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
        <a class="btn btn-primary" href="${APPSTORE_URL}" data-appstore>Découvrir Nyama</a>
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
        // Un jeton par article : le rapport d'Apple dira lequel fait installer.
        ct: jetonCampagne(`blog_${a.slug}`),
        jsonld: `<script type="application/ld+json">${JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: a.titre,
          description: a.description,
          datePublished: a.date,
          inLanguage: 'fr',
          mainEntityOfPage: `${ORIGINE}/blog/${a.slug}/`,
          author: { '@type': 'Organization', name: 'Nyama (Winstell)', url: `${ORIGINE}/` },
          publisher: { '@type': 'Organization', name: 'Winstell', url: `${ORIGINE}/`, logo: { '@type': 'ImageObject', url: `${ORIGINE}/assets/icone.png` } },
        })}</script>\n`,
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
  // L'alt de l'image de partage suit la langue de la page, pas le français.
  html = html.replace(
    /(<meta property="og:image:alt" content=")[^"]*(">)/,
    `$1${m.ogTitle}.$2`,
  );
  // Après la traduction des textes : les données structurées (dont la FAQ)
  // sont extraites de la page déjà dans sa langue.
  html = html.replace('</head>', `${liensAlternatifs()}${donneesStructurees(html, m)}</head>`);

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
  //    Le blog n'existe qu'en français : les autres langues n'affichent pas
  //    le lien du tout — déposer un anglophone sur du français vaut moins
  //    que pas de lien. À revoir le jour où /en/blog/ existera.
  if (!articles.length || lg !== 'fr') {
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
construisRobotsEtSitemap(articles);

console.log(total === 0 ? '\nToutes les clés sont traduites.' : `\n${total} traductions manquantes.`);
