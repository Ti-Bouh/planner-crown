# planner-crown
Planner Crown of the Gods

## Page Calculs (`calculs.html`)

Calculateurs reliés au planner (même connexion Google, même fiche « Je suis ») :

- **Ma cité** : fer, pierre et bois par jour repris automatiquement des raids d'une ville du Recrutement (ou saisis à la main) ; paramètres communs (recherche Construction Speed, fer / pierre / bois par jour, plan Arenas / Barracks, scénario testé) et contrôles de cohérence.
- **Castle** : Solveur (meilleure combinaison Arenas / Barracks / Cabines, calculée en direct pour n'importe quel nombre d'emplacements) et Simulateur détaillé avec courbe.
- **Cabines** : niveau et nombre optimaux selon le meilleur rapport temps / niveau (on monte d'un niveau tant qu'il fait gagner au moins le seuil choisi), gain et pierre par jour gagné pour chaque niveau, plan de démolition groupe par groupe.
- **Recrutement** : une fiche par ville (indépendantes), raids en cours (une ligne = une armée en boucle, modifiable, trajet aller en h:mm:ss), remplis automatiquement depuis une capture du rapport (lecture dans le navigateur avec Tesseract.js, contrôle Carried − Expended = Profit) ; zerks financés par heure à partir du fer net des pertes, 10 % gardés pour le raffinage, niveau des Training Arenas pour un recrutement continu (case « 1 Arena au niveau 10 »), raids nécessaires et surplus à raffiner.
- **Raids** : Simulateur (troupes à envoyer, mélanges Ranger : Triaire, calcul avec tes troupes), Journal des raids et Synthèse par configuration.

Fichiers : `src/calc-engine.js` (moteurs, portage formule par formule des classeurs Excel Crown), `src/calc-data.js` (données du jeu).

Enregistrement Firestore : `fiches/{fiche}/calculs/reglages` (réglages) `fiches/{fiche}/raids/{id}` (journal) et `fiches/{fiche}/recrutement/{ville}` + `…/rapports/{id}` (onglet Recrutement).
