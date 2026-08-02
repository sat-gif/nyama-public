# Pages publiques de Nyama

Site public de l'application Nyama (Winstell), servi par GitHub Pages sur
**https://getnyama.app**.

| Chemin              | Contenu                                    |
|---------------------|--------------------------------------------|
| `/`                 | Page de présentation — français            |
| `/blog/`            | Le blog, et un dossier par article          |
| `/confidentialite/` | Politique de confidentialité (français)    |
| `/conditions/`      | Redirige vers l'EULA standard d'Apple      |
| `/assistance/`      | Page d'assistance — l'URL donnée à Apple   |
| `/support/`         | Redirige vers `/assistance/`               |
| `/assets/`          | Icône, captures d'écran                    |

Ces quatre pages-là sont écrites **à la main** : `_build.mjs` ne génère que l'accueil
et le blog, il n'entre jamais dans ces dossiers.

## ⚠ Ne pas modifier `index.html` à la main

La page d'accueil est **générée**. Elle sera écrasée.

```
_src/index.html     la page française — LA source
_i18n/en.json       les traductions, repérées par les attributs data-i18n
_i18n/de.json
_i18n/es.json
_build.mjs          le générateur
```

Après toute modification du texte :

```bash
node _build.mjs
```

Puis committer les fichiers générés : GitHub Pages n'exécute rien, ce sont eux
qui sont publiés. Le générateur signale les clés non traduites au lieu de les
laisser passer en silence — il retombe alors sur le français.

### Ajouter une phrase à la page

1. L'écrire en français dans `_src/index.html`, avec un attribut
   `data-i18n="une.cle"` sur l'élément qui la porte.
2. Ajouter `"une.cle"` dans les trois fichiers de `_i18n/`.
3. `node _build.mjs`.

### Ouvrir une langue

Anglais, allemand et espagnol sont **traduits et prêts**, mais pas publiés.
Une seule ligne les ouvre, en tête de `_build.mjs` :

```js
const PUBLIEES = ['fr'];          // → ['fr', 'en'] pour ouvrir l'anglais
```

Puis `node _build.mjs` et committer. La page `/en/` est générée, son drapeau
apparaît dans le sélecteur, les liens hreflang la déclarent. Tant qu'une seule
langue est publiée, le sélecteur de drapeaux est retiré de la page : un drapeau
seul n'offre aucun choix.

### Ajouter une langue de plus

1. Copier un fichier de `_i18n/` et le traduire.
2. Ajouter le code dans `LANGUES` **et** dans `PUBLIEES`.
3. Ajouter un drapeau dans le sélecteur de `_src/index.html` (SVG en ligne,
   pas d'emoji : les drapeaux emoji ne s'affichent pas sous Windows).

## ⏳ Reste à faire : brancher le domaine

Le site est en ligne sur GitHub Pages et le domaine `getnyama.app` est déjà
déclaré côté GitHub (fichier `CNAME` + réglage Pages). **Il manque uniquement
le DNS**, chez Namecheap — tant qu'il n'est pas fait, le domaine affiche la
page parquée du registrar et `sat-gif.github.io/nyama-public/` y redirige.

Namecheap → Domain List → `getnyama.app` → Manage → onglet **Advanced DNS**.

**Supprimer** : le `A Record` sur `@` valant `192.64.119.90`, le `CNAME Record`
sur `www` valant `parkingpage.namecheap.com`, et tout `URL Redirect Record`.

**Ajouter** :

| Type         | Host  | Value                | TTL       |
|--------------|-------|----------------------|-----------|
| A Record     | `@`   | `185.199.108.153`    | Automatic |
| A Record     | `@`   | `185.199.109.153`    | Automatic |
| A Record     | `@`   | `185.199.110.153`    | Automatic |
| A Record     | `@`   | `185.199.111.153`    | Automatic |
| CNAME Record | `www` | `sat-gif.github.io.` | Automatic |

Propagation : 30 minutes à quelques heures.

⚠️ **Piège propre au `.app`** : ce TLD est sur la liste HSTS de Google, donc les
navigateurs forcent HTTPS en permanence. Entre le moment où le DNS pointe sur
GitHub et l'émission du certificat, le site affiche une **erreur de
certificat**. C'est normal, ce n'est pas une erreur de ta part. GitHub émet le
certificat tout seul ensuite ; il reste à cocher « Enforce HTTPS » dans les
réglages Pages du dépôt.

Non fait volontairement, pour ne pas ajouter de variables : enregistrements
AAAA (IPv6) et vérification de domaine GitHub. À envisager une fois que ça
tourne.

## Écrire un article de blog

Les articles sont des fichiers Markdown dans `_blog/`. Le nom du fichier donne
l'adresse : `ranger-ses-recettes.md` → `getnyama.app/blog/ranger-ses-recettes/`
(minuscules, tirets, pas d'accent).

Chaque fichier commence par un entête :

```markdown
---
title: Le titre de l'article
date: 2026-08-12
description: Une ou deux phrases, affichées sous le titre et données à Google.
draft: true
---
```

`draft: true` garde l'article hors ligne. `date` doit être au format
`AAAA-MM-JJ` : c'est elle qui classe les articles, du plus récent au plus
ancien. Un article sans date valable n'est pas publié et le générateur le dit.

Voir `_blog/exemple-a-supprimer.md` pour la syntaxe reconnue — à supprimer une
fois le premier vrai article écrit.

Puis, comme toujours : `node _build.mjs`, committer, pousser. Sont générés
`/blog/`, un dossier par article, et le flux RSS `/blog/feed.xml`.

Le lien « Blog » n'apparaît dans le menu que s'il existe au moins un article
publié — un lien vers une page vide vaut moins que pas de lien.

### Le Markdown reconnu

Titres `#` à `####`, `**gras**`, `*italique*`, `` `code` ``, `[liens](url)`,
`![images](/assets/x.png)`, listes à puces et numérotées, `> citations`,
`---` filets, blocs de code triples-accents. Les guillemets droits deviennent
des guillemets français et les apostrophes se courbent toutes seules.

Pas de tableaux ni de notes de bas de page : le convertisseur
(`_markdown.mjs`) est volontairement minimal, pour que le dépôt reste sans
aucune dépendance à installer. Un bloc qui commence par `<` est recopié tel
quel si tu as besoin de glisser du HTML.

## Le jour de la publication sur l'App Store

Deux valeurs à renseigner, dans le `<script id="appstore">` tout en bas de
`_src/index.html` — puis `node _build.mjs` et on committe :

```js
const APPSTORE_ID = null;   // ← l'Apple ID numérique de l'app
const APPSTORE_PT = null;   // ← le jeton de fournisseur « pt »
```

Où les trouver dans App Store Connect :

| Valeur | Chemin |
| --- | --- |
| `APPSTORE_ID` | Mes apps › Nyama › Informations sur l'app › **Apple ID** |
| `APPSTORE_PT` | Analyses › Acquisition › Campagnes › **Créer un lien de campagne** |

Tant qu'`APPSTORE_ID` vaut `null`, les boutons « Télécharger » font simplement
défiler la page jusqu'au bloc final, au lieu de mener sur une page inexistante.

### Les jetons de campagne

Chaque bouton App Store emporte un jeton `ct` qui remonte dans **Analyses ›
Acquisition › Campagnes** : c'est ce qui dit d'où viennent les installations.
Un bouton prend le jeton de sa page (l'attribut `data-ct` du `<body>`) ou le
sien propre s'il porte `data-appstore="mon_jeton"`.

Les jetons posés automatiquement :

| Page | Jeton |
| --- | --- |
| Accueil | `site_accueil` |
| Liste du blog | `blog_liste` |
| Chaque article | `blog_<slug de l'article>` |

Pour les liens qui ne vivent pas sur le site (bio Instagram, TikTok, newsletter,
signature d'e-mail), il faut composer l'adresse à la main sur le même modèle —
un jeton par endroit, sinon tout retombe dans le même sac :

```
https://apps.apple.com/app/id<APPSTORE_ID>?pt=<APPSTORE_PT>&ct=bio_instagram&mt=8
```

Le jeton doit rester court, sans accent ni espace (Apple tronque à 40 caractères).
`_build.mjs` normalise ceux qu'il génère ; ceux écrits à la main, c'est à toi.

## Pixels publicitaires (Meta, Google)

Le bandeau de consentement en bas de page est déjà en place, RGPD-compliant
(rien ne se charge avant un clic sur « Accepter », refuser ne charge rien,
« Gérer les cookies » dans le pied de page rouvre le choix). Il ne manque que
les identifiants, dans le `<script>` du bandeau à la fin de `_src/index.html` :

```js
const FB_PIXEL_ID = null;   // ← Gestionnaire d'événements Meta : ton Pixel ID
const GOOGLE_TAG_ID = null; // ← G-XXXXXXX (GA4) ou AW-XXXXXXXXX (Google Ads)
```

Tant qu'ils valent `null`, un « Accepter » ne charge rien — aucun risque
d'envoyer des données à un identifiant invalide entre-temps. Renseigne l'un,
l'autre, ou les deux, puis `node _build.mjs`, committer, pousser.

**`/confidentialite/` n'a volontairement pas été touchée** : c'est la politique
de confidentialité de l'application, un document distinct du site vitrine —
elle ne doit pas mélanger les deux. Toute disclosure sur les cookies du site
vit uniquement dans le bandeau lui-même (`_src/index.html`) et, si besoin, dans
la FAQ du site (`faq.a3`) — jamais dans ce fichier.

⚠️ Le texte du bandeau n'a pas été relu par un juriste — à faire vérifier
avant un vrai lancement de campagnes, comme pour tout texte à portée RGPD.

## Remplacer une capture d'écran

Les captures vivent dans `assets/` et sont référencées par leur nom :
`ecran-accueil.png`, `ecran-import.png`, `ecran-bibliotheque.png`, `ecran-cuisson.png`,
`ecran-recette.png`.
Déposer un fichier du même nom suffit — format portrait, idéalement 1206 × 2622.

Elles montrent l'application **en français** sur les quatre versions du site.
Pour les avoir dans chaque langue il faudrait recapturer l'app avec la langue
correspondante (réglage « Langue » dans l'app).

## Conditions d'utilisation

Nyama utilise le **contrat de licence utilisateur final standard d'Apple** :

<https://www.apple.com/legal/internet-services/itunes/dev/stdeula/>

Le pied de page pointe directement dessus. `/conditions/` redirige au même
endroit : c'est l'adresse stable à donner au paywall de l'application et à
App Store Connect, elle survivra à un changement d'URL côté Apple.

## Politique de confidentialité

Elle n'existe **qu'en français** pour l'instant. Les versions étrangères de la
page d'accueil y renvoient quand même : c'est un texte juridique, le traduire
crée l'obligation de garder les quatre versions synchronisées.
