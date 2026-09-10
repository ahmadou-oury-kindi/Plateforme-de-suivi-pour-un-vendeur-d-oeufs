/* =====================================================================
   SAUVEGARDE — export JSON / CSV, import JSON, remise a zero
   L'export JSON est le format de reference : c'est le seul qui puisse
   etre reimporte tel quel. Les CSV servent a la lecture (tableur).
   ===================================================================== */

/* Prepare l'API de telechargement si l'environnement en propose une.
   Sinon, doSave() bascule sur le presse-papier puis sur une fenetre. */
async function initDL() {
  try {
    if (window.claude) DL = await claude.use('downloads');
  } catch (e) { /* pas de telechargement natif : les replis suffisent */ }
}

/* Serialise un tableau en CSV. Guillemets, virgules et retours a la ligne
   sont echappes selon la convention RFC 4180. */
function csvStr(headers, rows) {
  const cell = function (v) {
    const s = String(v ?? '');
    return (s.includes(',') || s.includes('"') || s.includes('\n'))
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  };
  return [headers.join(','), ...rows.map(function (r) { return r.map(cell).join(','); })].join('\n');
}

/* Trois voies, de la meilleure a la plus rustique :
   telechargement natif, presse-papier, affichage dans une modale. */
async function doSave(filename, data) {
  if (DL) {
    try {
      await DL.save({ filename: filename, data: data });
      toast('Fichier exporté');
      return;
    } catch (e) {
      if (e.code === 'declined') return;
    }
  }
  try {
    await navigator.clipboard.writeText(data);
    toast('Copié dans le presse-papier (' + filename + ')', 'info');
  } catch (e) {
    openModal('Export — ' + filename,
      '<textarea class="export-area" readonly>' + esc(data) + '</textarea>'
      + '<div class="modal-ft"><button class="btn btn-p" onclick="closeModal()">Fermer</button></div>');
  }
}

function expJSON() {
  doSave('nenujolof_backup_' + today() + '.json',
    JSON.stringify({ version: 1, exported: new Date().toISOString(), data: S }, null, 2));
}

function expCSV(type) {
  if (type === 'clients') {
    doSave('clients.csv', csvStr(
      ['Nom', 'Téléphone', 'Statut', 'Client depuis', 'Ancienneté (mois)', 'Fidèle',
       "Raison inactivité", 'Type', 'Plateaux/semaine', 'Adresse', 'Notes'],
      S.clients.map(function (c) {
        return [c.name, c.phone, isActive(c) ? 'Actif' : 'Inactif',
                c.since || (c.createdAt || '').substring(0, 10), clientAge(c),
                isLoyal(c) ? 'Oui' : 'Non', c.inactiveReason || '', typeLabel(c),
                c.weeklyTrays || 0, c.address || '', c.notes || ''];
      })));

  } else if (type === 'expenses') {
    doSave('depenses.csv', csvStr(
      ['Date', 'Description', 'Catégorie', 'Montant'],
      S.expenses.map(function (e) { return [e.date, e.description, e.category, e.amount]; })));

  } else if (type === 'sales') {
    doSave('ventes.csv', csvStr(
      ['Date', 'Quantité', 'Prix vente', 'Prix revient', 'Marge'],
      S.sales.map(function (s) {
        return [s.date, s.quantity, s.sellingPrice, s.costPrice, (s.sellingPrice - s.costPrice) * s.quantity];
      })));

  } else if (type === 'debts') {
    doSave('dettes.csv', csvStr(
      ['Client', 'Date', 'Description', 'Montant', 'Réglé', 'Reste', 'Statut'],
      S.debts.map(function (d) {
        return [clientName(d.clientId), d.date, d.description || '', d.amount,
                debtPaid(d), Math.max(0, debtRemaining(d)),
                debtStatus(d) === 'soldee' ? 'Soldée' : 'En cours'];
      })));
  }
}

/* Import d'une sauvegarde JSON. Accepte le format enveloppe ({version,
   data}) comme l'objet brut, pour rester compatible avec les exports
   anciens. */
function doImport(input) {
  const f = input.files[0];
  if (!f) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const json = JSON.parse(e.target.result);
      const data = json.data || json;
      if (hasData(data) || data.clients || data.debts || data.expenses) {
        S = Object.assign(defaults(), data);
        save();
        render();
        toast('Données importées');
        rSettings();
      } else {
        toast('Format non reconnu', 'err');
      }
    } catch (err) {
      toast('Fichier JSON invalide', 'err');
    }
  };
  reader.readAsText(f);
  input.value = '';
}
