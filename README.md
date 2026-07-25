# Pages publiques de Nyama

Site public de l'application Nyama (Winstell), servi par GitHub Pages sur
**https://getnyama.app**.

| Chemin              | Contenu                          |
|---------------------|----------------------------------|
| `/`                 | Page de présentation (landing)   |
| `/confidentialite/` | Politique de confidentialité     |
| `/conditions/`      | Redirige vers l'EULA standard d'Apple |
| `/assets/`          | Icône, captures d'écran          |

## Le jour de la publication sur l'App Store

Une seule ligne à modifier, tout en bas de `index.html` :

```js
const APPSTORE_URL = null;   // ← remplacer par l'URL App Store
```

Tant qu'elle vaut `null`, les boutons « Télécharger » font simplement défiler la page
jusqu'au bloc final au lieu de mener sur une page inexistante.

## Remplacer une capture d'écran

Les captures vivent dans `assets/` et sont référencées par leur nom dans `index.html` :
`ecran-accueil.png`, `ecran-import.png`, `ecran-bibliotheque.png`, `ecran-cuisson.png`,
`ecran-recette.png`.
Déposer un fichier du même nom suffit — format portrait, idéalement 1206 × 2622.

## Conditions d'utilisation

Nyama utilise le **contrat de licence utilisateur final standard d'Apple** :

<https://www.apple.com/legal/internet-services/itunes/dev/stdeula/>

Le pied de page et la mention d'abonnement pointent directement dessus.
`/conditions/` redirige au même endroit : c'est l'adresse stable à donner au
paywall de l'application et à App Store Connect, elle survivra à un changement
d'URL côté Apple.
