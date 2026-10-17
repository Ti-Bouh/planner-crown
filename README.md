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
- Coller une capture dans le planner ouvre Calculs › Recrutement (`src/planner-addons.js`, injecté par `build.py`).
- Nombres lisibles dans les cases (« 1 000 000 ») et saisies « 150k », « 1,5M » acceptées.

