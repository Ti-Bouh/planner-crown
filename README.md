# planner-crown
Planner Crown of the Gods, hébergé sur GitHub Pages. Connexion Google, données dans Cloud Firestore
(`src/firebase-shim.js`, partagé par les deux pages ; accès limité aux comptes autorisés par les règles Firestore).

## Organisation du planner (`index.html`)

- **Moi** : Maintenant, Mes villes, Début de serveur (`calculs.html`).
- **Ensemble** : Binôme, Attaques, Défense, Carte et barons, Plans.
- **⚙ Réglages** : joueurs, import des exports du jeu, poids TS.
- `index.html#vue` ouvre directement une vue (utilisé par la barre de `calculs.html`).
- Toutes les listes suivent le même en-tête : titre, case « Voir les terminé(e)s », bouton « + … » qui ouvre le
  formulaire juste en dessous (`details.addp`, bouton `data-open`).

### Maintenant
Mes ordres, menaces ouvertes, résumé du binôme, raccourcis (menace, baron, opération).
Suggestions pour le site : collection `suggestions` (texte, fiche, statut `afaire` / `fait`, creeLe, maj), modifiables,
marquées faites puis rouvertes, supprimables ; les faites sont masquées sauf avec « Voir les terminées ».

### Mes villes
Ligne « Voir la fiche de » : Tous, une fiche par joueur, puis deux sous-onglets limités au joueur choisi dans « Je suis ».
- **Registre** : coordonnées, rôle, troupes, TS, hub de rattachement ; « + Ajouter une ville » dans son en-tête,
  modification sous la ligne de la ville (suppression dans le formulaire). Âge du dernier import stocké dans
  `fiches/{fiche}.importVilles` et `.importTroupes`, délai d'alerte dans Réglages.
- **Fortifications** (fiche d'une ville) : niveau du mur (repris de l'import des troupes) et postes de Rangers / Triaires
  (nombre et niveau, `villes/{id}.postes`).
- **Ravitaillement** : par ressource, ↑ = surplus envoyé au hub, R = surplus raffiné (les deux s'excluent,
  `res.{ressource}` = `hub` / `raffiner` / `garder`), ↓ = reçoit du hub (`recoit.{ressource}`, indépendant).
  En haut, les villes qui reçoivent du hub, par ressource. Pas de quantités.
- **Recherches** : recherches de combat par unité (`fiches/{fiche}.recherches`, niveaux 0 à 12), durabilité des
  bâtiments et fortifications (`fiches/{fiche}.durabilite`, enregistrée mais non utilisée dans la def conseillée, elle
  joue contre le siège) et foi des dieux Naera, Vexemis, Cyndros, Ylanna, commune à l'alliance (`reglages/foi`).
  Bonus = 0/1/3/6/10/15/20/25/30/35/40/45/50 % selon le niveau + 0,5 % par point de foi du dieu de l'unité
  (d'après les scripts de joueurs GFunky et Dfunky ; table confirmée par les recherches de durabilité du jeu).

### Défense
- Composition de l'attaque (facultative : Vanquisher, Cavalier, Sorcière, Druide, Bélier, Scorpion, Navire) dans
  `menaces/{id}.compo`. La carte de la menace affiche une **def conseillée** et une **alternative** : défense moyenne de
  chaque unité face au mélange d'attaque, nombre pour égaler l'attaque, villes qui ont l'unité (de la plus proche à la
  plus loin). Classement : unités disponibles d'abord, puis défense par ressource dépensée (pas de limite de place en
  renfort). L'ajout de renfort présélectionne l'unité conseillée.
- Couverture réelle : défense en points face à l'attaque (sur place + renforts, avec mur, recherches, foi et postes),
  repères égaler (= attaque) et écraser (4 × l'attaque) ; la pastille et le compteur « Couvertes » en découlent.
  Plan de renfort en un clic (unité conseillée d'abord, villes les plus proches, villes trop tardives écartées).
- Pour la ville menacée sont comptés : le mur (unités terrestres ; +1 % au niveau 1 à +50 % au niveau 10), les
  recherches de son propriétaire et les unités doublées par les postes (30 au niveau 1 à 2 000 au niveau 10 par poste).
- Données (`DEF_STATS`, `OFF_ATK` dans `index.html`) : wiki Crown of the Gods, valeurs de base. Ranger d'après sa
  fiche (déf. 40 / 10 / 25 / 15).

### Carte et barons
Terrain du continent, cases réservées, villes des autres joueurs, import du terrain depuis une capture. Panneau
« Barons envoyés » (collection `barons`) au-dessus de la carte ; les barons en route apparaissent aussi sur la carte.

### Plans
On colle un sharestring de plan de ville (`[ShareString.1.3]`, celui du jeu et de CotG Optimizer), avec un nom et une
note. Une ligne par plan (nom, auteur, principaux bâtiments, bouton Copier) ; en dépliant, le dessin (grille 19 × 19,
lettres) et le nombre de chaque bâtiment. Modifier, supprimer, filtrer par auteur ou chercher par nom. Collection
`plans` (nom, note, texte, fiche, creeLe, maj). Codes des bâtiments repris de CotG Optimizer (theladystar, GitHub).

## Début de serveur (`calculs.html`)

Même barre principale que le planner ; ses onglets propres sont en dessous :
« Au quotidien » (Recrutement, Raids) et « Préparer une cité » (Ma cité, Cabines, Castle).

- **Ma cité** : paramètres communs saisis une seule fois (recherche Construction Speed, fer envoyé par jour, Cabines
  démolies par groupes de…, plan de la cité : Barracks, Arenas, Académies, Marchés, Entrepôts, Tours, Castle) ;
  fer, pierre et bois par jour repris des raids d'une ville du Recrutement ou saisis à la main.
- **Castle** : Solveur (avec les Arenas et Barracks du plan de Ma cité, nombre et niveau de Cabines pour que le château
  soit construit et rempli — objectif de zerks — le plus tôt, soit max(construction, remplissage) minimal ; construire
  plus vite que le remplissage ne sert à rien, donc parmi les combinaisons à quelques heures du meilleur délai (3 h par
  défaut), le moins de pierre perdue ; la réponse indique si c'est le fer qui fixe le délai ; clic sur une des 10
  meilleures lignes pour la simuler) et Simulateur détaillé avec courbe.
- **Cabines** : niveau et nombre optimaux pour construire toute la cité au niveau 10 le plus vite possible
  (10 emplacements par niveau de Basilica), plan de démolition groupe par groupe (suit l'optimum par défaut,
  paramètre `gardees` de `cabDemolition` ; « Un autre cas » pour tester ses valeurs).
- **Recrutement** : une fiche par ville du planner, raids en cours (une ligne = une armée en boucle), remplis depuis une
  capture du rapport (Tesseract.js dans le navigateur, contrôle Carried − Expended = Profit) ; zerks financés par
  heure à partir du fer net des pertes, 10 % gardés pour le raffinage, niveau des Training Arenas pour un recrutement
  continu, raids nécessaires et surplus à raffiner. Le formulaire alimente aussi le Journal des raids.
- **Raids** : Simulateur (troupes à envoyer, mélanges Ranger : Triaire, peut suivre les troupes à la maison de la
  ville ouverte dans Recrutement), Journal des raids et Synthèse par configuration.
- Coller une capture dans le planner ouvre Début de serveur › Recrutement (`src/planner-addons.js`).
- Saisies « 150k », « 1,5M » acceptées ; nombres affichés « 1 000 000 ».

Fichiers : `src/calc-engine.js` (moteurs, portage formule par formule des classeurs Excel Crown),
`src/calc-data.js` (données du jeu).

Firestore : `fiches/{fiche}/calculs/reglages` (réglages), `fiches/{fiche}/raids/{id}` (journal),
`fiches/{fiche}/recrutement/{ville}` et `…/rapports/{id}` (Recrutement).
