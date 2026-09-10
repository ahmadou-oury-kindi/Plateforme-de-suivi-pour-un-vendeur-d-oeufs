# Prompt de refactoring — Nenu Jolof (Plateforme de suivi des ventes d'oeufs)

## Contexte

Nenu Jolof est une plateforme de suivi des ventes d'oeufs destinee a un distributeur base au Senegal. Elle fonctionne actuellement comme un **fichier HTML unique de ~1 100 lignes** (`nenujolof.html`) qui embarque tout le CSS, le HTML et le JavaScript. L'application tourne dans le navigateur Chrome via un lien `file://` local et persiste les donnees dans **localStorage** (cache rapide) + **Supabase** (backup cloud).

### Ce qui existe et fonctionne (a conserver integralement)

**7 pages fonctionnelles :**
1. **Dashboard** — KPIs du mois (stock, ventes, CA, marge, dettes, depenses), graphique barres des 7 derniers jours, compteurs clients/dettes
2. **Clients** — CRUD complet, filtres (grossiste/final), recherche, 47 clients reels en base
3. **Dettes** — Suivi avec paiements partiels, statut en cours/soldee, lien client, 19 dettes reelles
4. **Depenses** — Saisie par categorie (Transport, Loyer, Salaires, etc.), navigation par mois
5. **Stock** — Stock initial, receptions (quantite + prix de revient), inventaire du soir, calcul automatique des ventes (ouverture + recu - cloture = vendu)
6. **Marges** — Ventes du jour (quantite x prix de vente vs prix de revient), CA et marge brute mensuelle
7. **Parametres** — Export JSON/CSV, import JSON, donnees locales, section cloud Supabase (forcer synchro / restaurer), a propos

**Infrastructure :**
- Authentification simple (email/mot de passe en constantes JS)
- Systeme de navigation SPA (single-page app) avec sidebar
- Modales pour tous les formulaires CRUD
- Toasts de notification
- Responsive : sidebar fixe desktop, hamburger menu mobile
- Themes clair/sombre via CSS custom properties
- Polices : Outfit (titres) + Source Sans 3 (corps)
- Devise : FCFA (formatage francais)
- Sync cloud : localStorage en lecture rapide, Supabase en ecriture parallele a chaque `save()`

**Donnees reelles en production :**
- 47 clients (noms, telephones, types, adresses)
- 19 dettes (montants, paiements partiels)
- Stockees dans localStorage du navigateur Chrome (origine `file://`) ET dans Supabase (table `app_state`, JSONB)

**Supabase :**
- Projet ID : `vnvhupmczqwclgmdhqea`
- URL : `https://vnvhupmczqwclgmdhqea.supabase.co`
- Table : `app_state` (id=1, colonne `data` JSONB, `updated_at`)
- Cle anon dans le code (publique par conception, depot GitHub public)

---

## Besoin du client

> "Je veux rendre cela plus clair comme un developpeur normal, en commencant par l'arborescence du projet separant le backend et le frontend, puis apporter du style a la plateforme avec du CSS et du JavaScript pour l'interactivite — mais le tout tournant dans un seul lien HTML. Il faut conserver tout ce qui a ete fait, juste organiser et ameliorer le style."

### Traduction technique

Le client demande un **refactoring structurel et visuel** en deux axes :

---

### AXE 1 — Arborescence de developpement propre

Reorganiser le fichier monolithique `nenujolof.html` (1 113 lignes) en une **arborescence de projet modulaire** pour faciliter la maintenance, tout en conservant un **build qui produit un seul fichier HTML** en sortie.

**Arborescence cible suggeree :**

```
Nenu_Jolof/
  src/
    css/
      variables.css        <- custom properties (couleurs, espacements, rayons)
      base.css             <- reset, body, typographie
      layout.css           <- sidebar, main, hamburger, responsive
      components.css       <- boutons, badges, cartes, stats, modales, toasts
      forms.css            <- champs, selects, textareas
      tables.css           <- tableaux et wrappers overflow
      pages.css            <- styles specifiques par page (chart, today-card, etc.)
    js/
      constants.js         <- AUTH_E, AUTH_P, DB, SUPA_URL, SUPA_KEY, CATS, TYPES
      state.js             <- defaults(), load(), save(), variable S
      supabase.js          <- cloudPush(), cloudPull(), cloudRestore(), initCloud()
      utils.js             <- gid(), cfa(), fmtD(), today(), curMo(), moLabel(), esc()
      auth.js              <- doLogin(), doLogout(), showApp()
      nav.js               <- nav(), render(), toggleSide(), closeSide()
      ui.js                <- openModal(), closeModal(), showConfirm(), toast(), chgMonth()
      helpers/
        stock.js           <- getOpening(), getReceived(), getLatestCost(), getCurrentStock()
        clients.js         <- helpers clients (isActive, clientAge, isLoyal, typeLabel)
        debts.js           <- debtRemaining(), debtStatus(), clientName()
      pages/
        dashboard.js       <- rDash()
        clients.js         <- rClients(), addClient(), saveClient(), editClient(), etc.
        debts.js           <- rDebts(), addDebt(), saveDebt(), addPayment(), etc.
        expenses.js        <- rExpenses(), addExpense(), saveExpense(), etc.
        stock.js           <- rStock(), setInitStock(), addReception(), doInventory(), etc.
        margins.js         <- rMargins(), addSale(), saveSale(), etc.
        settings.js        <- rSettings(), expJSON(), expCSV(), doImport(), clearAll()
      init.js              <- point d'entree (S=load(), initDL(), initCloud(), etc.)
    html/
      login.html           <- structure HTML du login
      app.html             <- structure HTML de l'app (sidebar + pages)
      modal.html           <- structure HTML modale + toast
  build.js                 <- script Node.js qui assemble tout en un seul nenujolof.html
  nenujolof.html           <- FICHIER DE SORTIE (genere par le build, pas edite a la main)
  package.json             <- scripts: "build" pour generer le HTML final
```

**Contraintes du build :**
- Le fichier de sortie `nenujolof.html` doit etre **strictement autonome** : tout le CSS inline dans `<style>`, tout le JS inline dans `<script>`, tout le HTML dans le body
- Seule dependance externe autorisee : Google Fonts (lien `<link>`) et Supabase JS (CDN jsdelivr)
- Le fichier de sortie doit fonctionner en `file://` dans Chrome (pas de serveur requis)
- Les donnees existantes dans localStorage et Supabase doivent rester **intactes et compatibles** (meme cle `nj_data`, meme structure JSON, meme table `app_state`)
- Le build ne doit pas modifier la logique metier ni le modele de donnees

---

### AXE 2 — Ameliorations visuelles et UX

Enrichir l'interface **sans changer les fonctionnalites** existantes. Voici les pistes (a adapter selon le jugement du developpeur) :

**CSS :**
- Micro-animations et transitions douces (hover sur cartes, apparition des pages, ouverture sidebar)
- Ameliorer les cartes statistiques (icones, gradients subtils, ombre portee raffinee)
- Progress bar visuelle sur les dettes (montant paye / montant total)
- Meilleure hierarchie typographique (taille, espacement, contraste)
- Tableau plus lisible (lignes alternees, highlight au hover deja present mais a peaufiner)
- Empty states plus expressifs (illustration SVG simple ou icone + message engageant)
- Pastilles de statut plus visibles sur les badges

**JavaScript / Interactivite :**
- Animations de compteurs (les chiffres KPI qui "comptent" de 0 a la valeur reelle au chargement)
- Transition fluide entre les pages (fade ou slide leger)
- Feedback visuel au clic sur les boutons (ripple effect ou scale)
- Skeleton loading pendant le chargement cloud
- Confirmation visuelle de synchro Supabase (petite icone nuage avec check dans le header ou la sidebar)

**Design general :**
- Conserver l'identite visuelle existante : palette or/brun (#C78D1E, #2D2319), polices Outfit + Source Sans 3
- Conserver le theme clair/sombre tel quel
- L'objectif est de passer d'un "prototype fonctionnel" a une "app soignee" sans tout refaire

---

## Regles imperatives

1. **ZERO perte de donnees** — Les 47 clients et 19 dettes dans localStorage et Supabase doivent rester accessibles apres refactoring. Meme cle localStorage (`nj_data`), meme format JSON, meme table Supabase.
2. **Fichier de sortie unique** — L'utilisateur final ouvre toujours `nenujolof.html` en `file://` dans Chrome. Pas de serveur, pas de framework, pas de SPA router — c'est un fichier HTML autonome.
3. **Conserver toute la logique metier** — Toutes les fonctions CRUD, les calculs de stock, les marges, les paiements partiels, les exports doivent fonctionner a l'identique.
4. **Depot GitHub public** — Ne jamais mettre de secrets (service_role key, mots de passe) dans le code. La cle anon Supabase est publique par conception.
5. **Le build doit etre simple** — Un seul `npm run build` (ou equivalent) qui produit le HTML final. Pas de webpack, pas de bundler complexe — un script Node.js de concatenation/inline suffit.
