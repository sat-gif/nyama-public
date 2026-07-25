# Pages publiques de Nyama

Site public de l'application Nyama (Winstell), servi par GitHub Pages sur
**https://getnyama.app**.

| Chemin              | Contenu                                    |
|---------------------|--------------------------------------------|
| `/`                 | Page de présentation — français            |
| `/en/` `/de/` `/es/`| La même page en anglais, allemand, espagnol |
| `/confidentialite/` | Politique de confidentialité (français)    |
| `/conditions/`      | Redirige vers l'EULA standard d'Apple      |
| `/assets/`          | Icône, captures d'écran                    |

## ⚠ Ne pas modifier `index.html` à la main

Les quatre pages d'accueil sont **générées**. Elles seront écrasées.

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

### Ajouter une langue

1. Copier un fichier de `_i18n/` et le traduire.
2. Ajouter le code dans `LANGUES` en tête de `_build.mjs`.
3. Ajouter un drapeau dans le sélecteur de `_src/index.html` (SVG en ligne,
   pas d'emoji : les drapeaux emoji ne s'affichent pas sous Windows).

## Le jour de la publication sur l'App Store

Une seule ligne à modifier, tout en bas de `_src/index.html` :

```js
const APPSTORE_URL = null;   // ← remplacer par l'URL App Store
```

Tant qu'elle vaut `null`, les boutons « Télécharger » font simplement défiler la page
jusqu'au bloc final au lieu de mener sur une page inexistante.

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
