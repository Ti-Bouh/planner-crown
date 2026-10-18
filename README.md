# planner-crown
Planner Crown of the Gods

## Page Calculs (`calculs.html`)

Calculateurs reliés au planner (même connexion Google, même fiche « Je suis ») :

- **Ma cité** : fer, pierre et bois par jour repris automatiquement des raids d'une ville du Recrutement (ou saisis à la main) ; paramètres communs (recherche Construction Speed, fer / pierre / bois par jour, plan Arenas / Barracks, scénario testé) et contrôles de cohérence.
- **Castle** : Solveur (meilleure combinaison Arenas / Barracks / Cabines, calculée en direct pour n'importe quel nombre d'emplacements) et Simulateur détaillé avec courbe.
- **Cabines** : niveau et nombre optimaux pour construire toute la cité au niveau 10 le plus vite possible (plan saisi : Barracks, Arenas, Académies, Forums, entrepôts, tour, Castle ; 10 emplacements par niveau de Basilica ; démolition des Cabines par groupes), au meilleur rapport temps / niveau ; plan de démolition groupe par groupe.
- **Recrutement** : une fiche par ville (indépendantes), raids en cours (une ligne = une armée en boucle, modifiable, trajet aller en h:mm:ss), remplis automatiquement depuis une capture du rapport (lecture dans le navigateur avec Tesseract.js, contrôle Carried − Expended = Profit) ; zerks financés par heure à partir du fer net des pertes, 10 % gardés pour le raffinage, niveau des Training Arenas pour un recrutement continu (case « 1 Arena au niveau 10 »), raids nécessaires et surplus à raffiner.
- **Raids** : Simulateur (troupes à envoyer, mélanges Ranger : Triaire, calcul avec tes troupes), Journal des raids et Synthèse par configuration.

Fichiers : `src/calc-engine.js` (moteurs, portage formule par formule des classeurs Excel Crown), `src/calc-data.js` (données du jeu).

Enregistrement Firestore : `fiches/{fiche}/calculs/reglages` (réglages) `fiches/{fiche}/raids/{id}` (journal) et `fiches/{fiche}/recrutement/{ville}` + `…/rapports/{id}` (onglet Recrutement).

### Ergonomie
- Onglets groupés par usage : « Au quotidien » (Recrutement, Raids) et « Préparer une cité » (Ma cité, Cabines, Castle) ; une ligne d'explication pour l'onglet ouvert ; réglages rarement utilisés repliés dans « Réglages avancés ».
- Villes du Recrutement choisies parmi les villes du planner (`fiches/{fiche}/villes`) : nom, coordonnées et troupes repris de l'import CSV ; Raids peut reprendre les Rangers / Triaires à la maison.
- Un rapport de raid alimente le Recrutement et, pour une armée Rangers / Triaires, le Journal des raids (caverne, niveau et troupes envoyées lus sur la capture, pertes déduites de « Expended »).
- Coller une capture dans le planner ouvre Calculs › Recrutement (`src/planner-addons.js`, chargé par `index.html`).
- Nombres lisibles dans les cases (« 1 000 000 ») et saisies « 150k », « 1,5M » acceptées.


## Planner : modifications faites directement dans index.html

Depuis la mise à jour « ergonomie 2 », `index.html` est modifié directement : onglets groupés Moi / Ensemble,
menu déroulant par ressource dans le registre, alertes de ville retirées, âge du dernier import
(stocké dans `fiches/{fiche}.importVilles` et `.importTroupes`, délai d'alerte dans Réglages),
raccourcis sur Maintenant, modification d'une ville sous sa ligne (suppression dans le formulaire),
Attaques en étapes 1-2-3 et notifications visibles. L'ancien script `build.py` (génération depuis la source de
l'artifact) a été retiré : il aurait écrasé ces changements.

### Défense : def conseillée
Dans « Signaler une menace », la composition de l'attaque (facultative : Vanquisher, Cavalier, Sorcière, Druide, Bélier, Scorpion, Navire) est enregistrée dans `menaces/{id}.compo`.
La carte de la menace affiche alors une **def conseillée** et une **alternative** : défense moyenne de chaque unité face au mélange d'attaque, nombre pour égaler l'attaque et la liste des villes qui ont l'unité (nom, joueur, trajet), de la plus proche à la plus loin.
Classement : unités disponibles d'abord, puis défense par ressource dépensée (pas de limite de place en renfort). L'ajout de renfort présélectionne l'unité conseillée.
Données (`DEF_STATS`, `OFF_ATK` dans `index.html`) : wiki Crown of the Gods, valeurs de base. Ranger ajouté d'après sa fiche (déf. 40 / 10 / 25 / 15).


### Maintenant : suggestions pour le site
Encart « Suggestions pour le site » dans l'onglet Maintenant, sous « Mes ordres » : on écrit une idée, elle est enregistrée pour les deux joueurs (collection Firestore `suggestions` : texte, fiche, statut `afaire`/`fait`, creeLe, maj). Chaque suggestion peut être modifiée, marquée faite (puis rouverte) ou supprimée ; les faites sont masquées sauf avec « Voir les faites ».
