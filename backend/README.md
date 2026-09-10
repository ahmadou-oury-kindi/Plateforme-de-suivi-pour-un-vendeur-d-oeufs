# Backend — Supabase

Le backend de Nenu Jolof est un projet Supabase. Il n'y a pas de serveur a
deployer : le frontend parle directement a l'API REST de Supabase, et c'est
Supabase qui gere l'authentification et les regles d'acces.

## Projet

| | |
|---|---|
| Project ID | `vnvhupmczqwclgmdhqea` |
| URL | `https://vnvhupmczqwclgmdhqea.supabase.co` |
| Table | `public.app_state` |

## Modele de donnees

Une seule table, une seule ligne (`id = 1`).

| Colonne | Type | Role |
|---|---|---|
| `id` | `bigint` | Toujours `1` |
| `data` | `jsonb` | L'etat complet de l'application |
| `updated_at` | `timestamptz` | Date de la derniere ecriture |

La colonne `data` contient exactement l'objet que le frontend garde en
memoire, et qu'il met aussi en cache dans le `localStorage` sous la cle
`nj_data` :

```json
{
  "initialStock": 120,
  "initialStockDate": "2026-01-05",
  "clients":    [{ "id": "...", "name": "...", "phone": "...", "type": "final", "status": "actif", "since": "2025-11-02", "weeklyTrays": 4, "address": "...", "notes": "..." }],
  "debts":      [{ "id": "...", "clientId": "...", "amount": 45000, "description": "...", "date": "2026-02-11", "payments": [{ "id": "...", "amount": 15000, "date": "...", "note": "..." }] }],
  "expenses":   [{ "id": "...", "description": "...", "amount": 12000, "category": "Transport", "date": "2026-02-11" }],
  "receptions": [{ "id": "...", "date": "2026-02-11", "quantity": 200, "costPrice": 2600, "supplier": "..." }],
  "daily":      [{ "date": "2026-02-11", "closingStock": 84 }],   // inventaires physiques : points de recalage du stock
  "sales":      [{ "id": "...", "date": "2026-02-11", "quantity": 30, "sellingPrice": 3000, "costPrice": 2600 }]
}
```

Ce format ne doit pas changer sans migration : les donnees de production
(clients et dettes reels) sont deja stockees ainsi, a la fois dans Supabase
et dans le navigateur du gerant.

Le stock, lui, n'est jamais stocke : il se calcule a partir de
`initialStock`, de `receptions` et de `sales`. Une entree de `daily` est un
comptage physique — elle ne decrit pas une journee, elle recale le compteur
a cette date, et tout ce qui la precede cesse d'entrer dans le calcul. Voir
`frontend/src/js/helpers/stock.js`.

## Installation

Dans Supabase : **Dashboard > SQL Editor > New query**, puis executer dans
l'ordre :

1. `supabase/01_schema.sql` — cree la table et la ligne `id = 1`
2. `supabase/02_policies.sql` — verrouille l'acces (RLS)

Les deux scripts sont rejouables : les relancer ne detruit aucune donnee.

## Acces et securite

- L'application n'utilise que la **cle anon**, publique par conception. Elle
  n'ouvre aucun acces a elle seule.
- Toute lecture et toute ecriture passent par une **session authentifiee**
  (`auth.signInWithPassword`). Sans session, les regles RLS refusent tout.
- Les politiques limitent en plus l'acces a une **liste d'emails** definie
  dans `02_policies.sql`. Pour ajouter un collaborateur, ajoutez son email
  dans les trois politiques et relancez le fichier.
- Aucune politique `DELETE` n'existe : la ligne ne peut pas etre effacee.
- La cle `service_role` ne doit **jamais** apparaitre dans le frontend :
  elle contourne toutes les regles.

## Comptes

Les comptes sont crees dans **Dashboard > Authentication > Users**. L'email
du compte doit figurer dans les politiques de `02_policies.sql`, sinon la
connexion reussit mais aucune donnee n'est visible.
