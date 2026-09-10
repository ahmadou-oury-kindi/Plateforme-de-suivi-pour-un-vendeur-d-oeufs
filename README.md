# Nenu Jolof — Plateforme de suivi des ventes d'oeufs

Application de gestion pour un distributeur d'oeufs au Sénégal : clients,
dettes, dépenses, stock et marges. Montants en FCFA.

L'utilisateur final ouvre **un seul fichier**, `nenujolof.html`, directement
dans Chrome (`file://`). Pas de serveur, pas d'installation. Ce fichier est
**généré** à partir des sources : on ne l'édite jamais à la main.

---

## Démarrage rapide

```bash
npm run build      # régénère nenujolof.html à partir de frontend/src/
```

Puis ouvrir `nenujolof.html` dans Chrome. Node.js 14+ suffit ; il n'y a
aucune dépendance à installer.

---

## Arborescence

```
Nenu_Jolof/
  backend/                     Supabase : base de données et règles d'accès
    supabase/
      01_schema.sql            table app_state (une ligne JSONB)
      02_policies.sql          RLS : accès réservé aux emails autorisés
    README.md                  modèle de données et procédure d'installation

  frontend/
    src/
      css/                     9 feuilles, chargées dans l'ordre de la cascade
        variables.css          couleurs, ombres, rayons, durées (3 thèmes)
        base.css               reset, typographie, éléments natifs
        animations.css         keyframes + respect de prefers-reduced-motion
        layout.css             sidebar, zone principale, en-tête de page
        components.css         boutons, cartes, stats, badges, modale, toasts
        forms.css              champs, selects, recherche
        tables.css             tableaux et débordement horizontal
        pages.css              styles propres à un écran
        responsive.css         chargée en dernier : surcharge tout le reste

      js/
        core/                  noyau non visuel
          constants.js         clés, URL Supabase, catégories, types client
          state.js             objet S, defaults(), load(), save()
          utils.js             identifiants, formatage, dates, échappement
          supabase.js          cloudPush / cloudPull / initCloud
          auth.js              connexion, déconnexion
          backup.js            export JSON-CSV, import, remise à zéro
        ui/                    briques d'interface partagées
          icons.js             jeu d'icônes SVG inline
          components.js        st(), emptyState(), prog(), moNav(), searchBar()
          modal.js             openModal, closeModal, showConfirm
          toast.js             notifications
          theme.js             clair / sombre / système
          sync.js              indicateur de sauvegarde cloud
          counters.js          animation des chiffres clés
          ripple.js            retour visuel au clic
          nav.js               navigation entre pages, render(), chgMonth()
        helpers/               calculs métier, sans DOM
          stock.js             stock déduit des mouvements, écart d'inventaire
          clients.js           type, statut, ancienneté, demande hebdo
          debts.js             réglé, reste dû, statut
        pages/                 un fichier par écran : rendu + formulaires
          dashboard.js  clients.js  debts.js  expenses.js
          stock.js      margins.js  settings.js
        init.js                séquence de démarrage (assemblé en dernier)

      html/
        index.html             coquille avec les emplacements à remplir
        login.html             écran de connexion
        app.html               sidebar + conteneurs de pages
        modal.html             modale et zone de toasts

  build.js                     assemble tout en un seul HTML
  package.json                 script "build"
  nenujolof.html               SORTIE DU BUILD — ne pas éditer
```

> Le brief initial proposait `src/` à la racine. Les sources sont sous
> `frontend/src/` pour que la séparation frontend / backend demandée soit
> visible dès le premier niveau de l'arborescence. Le découpage interne est
> celui du brief, avec deux dossiers ajoutés (`core/`, `ui/`) qui évitent
> d'avoir quinze fichiers à plat dans `js/`.

---

## Direction visuelle

Quatre règles gouvernent l'interface. Elles sont écrites ici parce qu'une
retouche qui les ignore fait retomber l'écran dans le « template admin ».

1. **L'encre porte l'identité, pas les aplats.** Le brun de la marque
   (`#241D15`) est la couleur du texte, des pills sélectionnées, des fonds
   pleins. La sidebar est claire : un bandeau brun opaque occupait un quart
   de l'écran en permanence et écrasait le contenu.
2. **L'or est un accent, jamais un fond.** Il est réservé à l'action
   principale, à l'onglet actif et au stock. Un seul bouton or par bloc —
   tous les autres sont neutres. Employé partout, il ne ressort nulle part.
3. **La hiérarchie vient de la typographie, pas des bordures.** Une valeur
   clé fait 2,5 rem, une statistique 1,65 rem, une légende 0,79 rem. Le
   tableau de bord ne montre plus sept cartes de poids égal : l'argent du
   mois d'abord, le stock ensuite, la tendance après, le détail en dernier.
4. **Les teintes claires sont des couleurs pleines, pas des alpha.** Un
   `rgba()` posé sur un fond variable se délave ; `--gold-bg` et consorts
   restent nets partout.

L'échelle d'espacement (`--s1` à `--s8`), les rayons et les durées sont dans
`variables.css`. Les trois blocs de ce fichier — clair, sombre système,
sombre forcé — décrivent le même jeu de variables : une couleur ne doit
jamais être définie dans un seul des trois.

## Comment fonctionne le build

`build.js` fait trois choses, et rien d'autre :

1. il concatène les CSS dans l'ordre de la cascade, puis les modules JS dans
   l'ordre d'exécution — les deux listes sont en haut du fichier ;
2. il injecte le résultat dans `frontend/src/html/index.html`, à la place des
   marqueurs `<!--@CSS-->`, `<!--@LOGIN-->`, `<!--@APP-->`, `<!--@MODAL-->`
   et `<!--@JS-->` ;
3. il vérifie que le JavaScript produit se parse (`new Function`) et refuse
   d'écrire le fichier sinon.

Pas de bundler, pas de transpilation, pas de minification : le code du
fichier généré est exactement celui des sources, avec un commentaire qui
rappelle le fichier d'origine avant chaque bloc.

**Conséquence à connaître :** tout le JavaScript finit dans un seul
`<script>`. Les modules partagent donc une portée globale unique, et l'ordre
de la liste `JS_FILES` compte pour les constantes et les variables. Les
déclarations `function` sont remontées par le moteur, elles peuvent donc
s'appeler entre fichiers sans contrainte d'ordre. `init.js` reste en dernier.

### Ajouter une page

1. un `<div id="pg-maPage" class="page" hidden>` dans `html/app.html` ;
2. un `<li class="nav-item" data-p="maPage" onclick="nav('maPage')">` dans la
   sidebar du même fichier ;
3. un `js/pages/maPage.js` exportant `rMaPage()` ;
4. la ligne correspondante dans `PAGES` (`js/ui/nav.js`) et dans `JS_FILES`
   (`build.js`).

---

## Données

L'application garde tout son état dans un objet unique, `S`. Il est
sauvegardé à deux endroits à chaque `save()` :

- **localStorage**, clé `nj_data` — cache de lecture, instantané ;
- **Supabase**, table `app_state`, ligne `id = 1` — sauvegarde de référence.

Au démarrage, `initCloud()` applique une règle asymétrique : le cloud ne
remplace le cache local que si celui-ci est **vide**. Sinon c'est le local
qui est poussé vers le cloud. C'est ce qui évite d'écraser une saisie faite
hors ligne.

Le format de `S` est décrit dans [backend/README.md](backend/README.md). Il
ne doit pas changer sans migration : les données de production (clients et
dettes réels) sont déjà stockées sous cette forme.

Le pied de la sidebar affiche en permanence l'état de la sauvegarde cloud —
`Sauvegardé`, `Synchro...`, `Non sauvegardé`, `Hors ligne`.

---

## Sécurité

- Seule la **clé anon** de Supabase figure dans le code. Elle est publique
  par conception et n'ouvre aucun accès à elle seule.
- L'accès aux données passe par une **session authentifiée**. Sans session,
  les règles RLS refusent toute lecture et toute écriture.
- Les politiques limitent en plus l'accès à une **liste d'emails**, définie
  dans `backend/supabase/02_policies.sql`.
- La clé `service_role` ne doit **jamais** entrer dans ce dépôt : elle
  contourne toutes les règles.
- Toute donnée saisie par l'utilisateur passe par `esc()` avant d'être
  insérée dans un gabarit HTML.

---

## Dépendances externes

Deux seulement, toutes deux chargées depuis un CDN :

- Google Fonts — Outfit (titres) et Source Sans 3 (corps) ;
- `@supabase/supabase-js` 2.49.8 — client de synchronisation.

Sans réseau, l'application affiche l'écran de connexion et signale
`Hors ligne` ; les polices retombent sur celles du système.
