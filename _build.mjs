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
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

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

/** Liens hreflang : chaque version déclare toutes les autres. */
function liensAlternatifs() {
  const l = LANGUES.map(
    (lg) =>
      `<link rel="alternate" hreflang="${lg}" href="${ORIGINE}${dico[lg]._meta.dir}">`,
  );
  l.push(`<link rel="alternate" hreflang="x-default" href="${ORIGINE}/">`);
  return l.join('\n');
}

const source = readFileSync(new URL('_src/index.html', import.meta.url), 'utf8');
let total = 0;

for (const lg of LANGUES) {
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

  // 3. Le drapeau actif dans le sélecteur de langue.
  html = html.replace(' aria-current="true"', '');
  html = html.replace(
    `<a href="${m.dir}" hreflang="${m.lang}"`,
    `<a href="${m.dir}" hreflang="${m.lang}" aria-current="true"`,
  );

  // 4. Bandeau « fichier généré » pour qui ouvrirait la sortie par erreur.
  html = html.replace(
    '<!DOCTYPE html>',
    `<!DOCTYPE html>\n<!-- FICHIER GÉNÉRÉ — ne pas modifier à la main.\n     Source : _src/index.html + _i18n/*.json, puis « node _build.mjs ». -->`,
  );

  const chemin = lg === 'fr' ? 'index.html' : `${lg}/index.html`;
  if (lg !== 'fr') mkdirSync(new URL(`${lg}/`, import.meta.url), { recursive: true });
  writeFileSync(new URL(chemin, import.meta.url), html);

  const restantes = (html.match(/data-i18n="/g) || []).length;
  console.log(
    `${chemin.padEnd(16)} ${restantes} clés` +
      (manquantes.length ? `  ⚠ traductions manquantes : ${manquantes.join(', ')}` : ''),
  );
  total += manquantes.length;
}

console.log(total === 0 ? '\nToutes les clés sont traduites.' : `\n${total} traductions manquantes.`);
