/**
 * Un convertisseur Markdown → HTML volontairement MINIMAL.
 *
 * Pourquoi pas une bibliothèque : ce dépôt n'a ni `package.json` ni
 * `node_modules`, et GitHub Pages n'installe rien. Une dépendance obligerait à
 * committer un dossier de milliers de fichiers pour écrire des articles de
 * blog. Le sous-ensemble ci-dessous couvre ce qu'on écrit vraiment.
 *
 * Reconnu :
 *   # ## ### ####     titres
 *   **gras**  *italique*  `code`
 *   [texte](url)      liens (cible _blank hors du site)
 *   ![alt](src)       images
 *   - item / 1. item  listes
 *   > citation        citation
 *   ---               filet
 *   ```               bloc de code
 *   ligne vide        séparateur de blocs
 *
 * Non reconnu : tableaux, notes de bas de page, HTML brut au milieu d'un
 * paragraphe. Un bloc qui commence par « < » est recopié tel quel, ce qui
 * suffit pour glisser un encadré à la main.
 */

const echappe = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Les guillemets français et les apostrophes typographiques, sans y penser. */
function typographie(s) {
  return s
    .replace(/"([^"]+)"/g, '« $1 »')
    .replace(/(\w)'(\w)/g, '$1’$2')
    .replace(/\.\.\./g, '…')
    .replace(/(\S) ([:;!?])/g, '$1 $2'); // espace fine insécable avant : ; ! ?
}

/** Le style « en ligne » : gras, italique, code, liens, images. */
function enLigne(s) {
  return (
    s
      // Le code d'abord : ce qu'il contient ne doit plus être interprété.
      .replace(/`([^`]+)`/g, (_, c) => `<code>${echappe(c)}</code>`)
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) =>
        u.startsWith('http')
          ? `<a href="${u}" target="_blank" rel="noopener">${t}</a>`
          : `<a href="${u}">${t}</a>`,
      )
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
  );
}

const bloc = (s) => enLigne(typographie(s));

export function markdown(src) {
  const lignes = src.replace(/\r\n/g, '\n').split('\n');
  const sortie = [];
  let i = 0;

  while (i < lignes.length) {
    const l = lignes[i];

    // Ligne vide
    if (!l.trim()) { i++; continue; }

    // Bloc de code
    if (l.startsWith('```')) {
      const corps = [];
      i++;
      while (i < lignes.length && !lignes[i].startsWith('```')) corps.push(lignes[i++]);
      i++;
      sortie.push(`<pre><code>${echappe(corps.join('\n'))}</code></pre>`);
      continue;
    }

    // Filet
    if (/^---+$/.test(l.trim())) { sortie.push('<hr>'); i++; continue; }

    // Titre
    const t = l.match(/^(#{1,4})\s+(.*)$/);
    if (t) {
      const n = t[1].length + 1; // « # » d'un article = <h2> : le <h1> est le titre
      sortie.push(`<h${n}>${bloc(t[2])}</h${n}>`);
      i++;
      continue;
    }

    // Citation
    if (l.startsWith('> ')) {
      const corps = [];
      while (i < lignes.length && lignes[i].startsWith('> ')) corps.push(lignes[i++].slice(2));
      sortie.push(`<blockquote><p>${bloc(corps.join(' '))}</p></blockquote>`);
      continue;
    }

    // Listes
    const puce = /^[-*]\s+/;
    const numero = /^\d+\.\s+/;
    if (puce.test(l) || numero.test(l)) {
      const ordonnee = numero.test(l);
      const marque = ordonnee ? numero : puce;
      const items = [];
      while (i < lignes.length && marque.test(lignes[i])) {
        items.push(`<li>${bloc(lignes[i].replace(marque, ''))}</li>`);
        i++;
      }
      const b = ordonnee ? 'ol' : 'ul';
      sortie.push(`<${b}>${items.join('')}</${b}>`);
      continue;
    }

    // HTML brut recopié tel quel
    if (l.startsWith('<')) {
      const corps = [];
      while (i < lignes.length && lignes[i].trim()) corps.push(lignes[i++]);
      sortie.push(corps.join('\n'));
      continue;
    }

    // Paragraphe : tout jusqu'à la prochaine ligne vide
    const corps = [];
    while (i < lignes.length && lignes[i].trim() && !/^(#{1,4}\s|```|>\s|[-*]\s|\d+\.\s)/.test(lignes[i])) {
      corps.push(lignes[i++]);
    }
    const texte = bloc(corps.join(' '));
    // Une image seule ne s'emballe pas dans un <p> : elle doit pouvoir respirer.
    sortie.push(/^<img /.test(texte) ? texte : `<p>${texte}</p>`);
  }

  return sortie.join('\n');
}

/**
 * Sépare l'entête `--- clé: valeur ---` du corps de l'article.
 * Les valeurs sont des chaînes brutes ; `draft: true` est le seul booléen lu.
 */
export function frontmatter(src) {
  const m = src.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, corps: src };
  const meta = {};
  for (const ligne of m[1].split('\n')) {
    const p = ligne.indexOf(':');
    if (p === -1) continue;
    meta[ligne.slice(0, p).trim()] = ligne.slice(p + 1).trim().replace(/^["']|["']$/g, '');
  }
  return { meta, corps: m[2] };
}

/** Résumé de repli quand l'article ne déclare pas de `description`. */
export function extrait(corpsHtml, taille = 165) {
  const texte = corpsHtml
    .replace(/<(pre|blockquote)[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (texte.length <= taille) return texte;
  return texte.slice(0, texte.lastIndexOf(' ', taille)) + '…';
}
