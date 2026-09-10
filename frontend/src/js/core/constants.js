/* =====================================================================
   CONSTANTES — valeurs fixes de l'application
   Aucun secret ici. La cle « anon » est publique par conception : elle
   n'ouvre aucun acces a elle seule, c'est la session Supabase de
   l'utilisateur qui donne acces aux donnees (voir backend/README.md).
   Ne JAMAIS placer la cle service_role dans ce fichier : elle contourne
   toutes les regles RLS.
   ===================================================================== */

/* Cle du cache navigateur. NE PAS CHANGER : les donnees de production du
   gerant sont deja stockees sous ce nom. */
const DB = 'nj_data';

/* Cle du theme choisi manuellement (independante des donnees metier) */
const THEME_KEY = 'nj_theme';

/* Backend Supabase */
const SUPA_URL = 'https://vnvhupmczqwclgmdhqea.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZudmh1cG1jenF3Y2xnbWRocWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4ODcxNTgsImV4cCI6MjEwNDQ2MzE1OH0.HuxQ1YTqAvfyhar8CGcxypzuMNeho43LT-Gciqfks6c';

/* Categories de depenses proposees dans le formulaire */
const CATS = ['Transport', 'Téléphone', 'Loyer', 'Salaire', 'Électricité', 'Divers'];

/* Types de client.
   v = valeur stockee · l = libelle long · p = pluriel (filtres)
   s = libelle court (listes deroulantes) · b = classe de badge */
const TYPES = [
  { v: 'final',       l: 'Client final', p: 'Clients finaux', s: 'Final',      b: 'badge-blue'  },
  { v: 'boutiquier',  l: 'Boutiquier',   p: 'Boutiquiers',    s: 'Boutiquier', b: 'badge-gold'  },
  { v: 'grossiste',   l: 'Grossiste',    p: 'Grossistes',     s: 'Grossiste',  b: 'badge-green' }
];

/* Anciennete, en mois, a partir de laquelle un client est dit « fidele » */
const LOYAL_MO = 3;

/* Seuils de couverture du stock, en jours de consommation */
const COVER_LOW = 3;   /* en dessous : rouge  */
const COVER_MID = 7;   /* en dessous : orange */
