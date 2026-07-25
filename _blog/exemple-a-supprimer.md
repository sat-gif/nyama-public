---
title: Le titre de ton article
date: 2026-07-25
description: Une ou deux phrases. Elles s'affichent sous le titre, dans la liste des articles, et servent de description pour Google et les réseaux.
draft: true
---

Ce fichier est un **exemple**. Il ne sera pas publié tant que `draft: true` est
dans son entête. Copie-le, renomme-le, écris par-dessus.

Le nom du fichier donne l'adresse : `ranger-ses-recettes.md` devient
`getnyama.app/blog/ranger-ses-recettes/`. Des minuscules, des tirets, pas
d'accent.

## Un intertitre

Un paragraphe se sépare du suivant par une ligne vide. On peut mettre du
**gras**, de l'*italique*, un [lien](https://getnyama.app) et du `code`.

- une liste à puces
- deuxième point
- troisième point

1. une liste numérotée
2. deuxième point

> Une citation, pour poser une idée forte au milieu du texte.

### Un sous-intertitre

Pour une image, la déposer dans `assets/` puis :

![Description de l'image, pour ceux qui ne la voient pas](/assets/ecran-bibliotheque.png)

---

Trois tirets tracent un filet de séparation. Les guillemets droits deviennent
des guillemets français tout seuls, et les apostrophes se courbent.

## Quand c'est prêt

1. Retirer la ligne `draft: true` de l'entête.
2. Mettre la vraie `date` au format `AAAA-MM-JJ` — c'est elle qui classe les
   articles, du plus récent au plus ancien.
3. Lancer `node _build.mjs` à la racine du dépôt.
4. Committer et pousser. Le lien « Blog » apparaît dans le menu dès qu'il y a
   au moins un article publié.
