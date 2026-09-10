/* =====================================================================
   PAGE — PARAMETRES
   Quatre blocs, dans l'ordre ou l'on s'en sert : sortir les donnees,
   les rentrer, verifier la sauvegarde cloud, proteger le compte. Les deux
   blocs qui tiennent en une phrase — import et cloud — se partagent une
   ligne ; les deux autres, plus fournis, la prennent entiere.

   Le bloc « donnees locales » a ete retire : compter les enregistrements
   n'apprenait rien, et le bouton « effacer toutes les donnees » n'avait
   rien a faire dans un ecran ouvert tous les jours. Une remise a zero se
   fait desormais par un import, qui remplace les donnees en gardant une
   trace de ce qu'on met a la place.
   ===================================================================== */
function rSettings() {
  const heure = lastSync
    ? lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : null;

  document.getElementById('pg-settings').innerHTML = `
    <div class="pg-hd"><h1>Paramètres</h1></div>

    <div class="card card-wide">
      <h3>${icon('download')} Exporter les données</h3>

      <div class="set-group">
        <span class="eyebrow">Rapports PDF</span>
        <p class="set-hint">Documents mis en page, prêts à enregistrer en PDF ou à imprimer.
          Choisissez « Enregistrer au format PDF » comme destination dans la fenêtre d'impression.</p>
        <div class="set-mo">
          <div class="form-g"><label for="repMo">Mois du rapport</label>
            <select id="repMo">${moOptions(selMonth)}</select>
          </div>
        </div>
        <div class="btn-group">
          <button class="btn btn-p" onclick="repMonth(val('repMo'))">${icon('receipt')} Rapport mensuel</button>
          <button class="btn btn-s" onclick="repStock(val('repMo'))">${icon('box')} Journal du stock</button>
          <button class="btn btn-s" onclick="repClients()">${icon('users')} Fichier clients</button>
          <button class="btn btn-s" onclick="repDebts()">${icon('wallet')} État des créances</button>
        </div>
      </div>

      <div class="set-group">
        <span class="eyebrow">Sauvegarde réimportable</span>
        <p class="set-hint">Le fichier JSON contient tout et reste le seul format que
          l'application sait relire. Gardez-en une copie hors de ce téléphone.</p>
        <div class="btn-group">
          <button class="btn btn-s" onclick="expJSON()">${icon('db')} Sauvegarde JSON complète</button>
        </div>
      </div>

      <div class="set-group">
        <span class="eyebrow">Tableurs CSV</span>
        <p class="set-hint">Pour retravailler les chiffres dans Excel ou Google Sheets.</p>
        <div class="btn-group">
          <button class="btn btn-s btn-sm" onclick="expCSV('clients')">Clients</button>
          <button class="btn btn-s btn-sm" onclick="expCSV('debts')">Dettes</button>
          <button class="btn btn-s btn-sm" onclick="expCSV('expenses')">Dépenses</button>
          <button class="btn btn-s btn-sm" onclick="expCSV('sales')">Ventes</button>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>${icon('upload')} Importer des données</h3>
      <p class="card-sub">Restaurez vos données depuis un fichier JSON exporté précédemment.
        L'import <strong>remplace</strong> les données actuelles, ici et dans le cloud.</p>
      <input type="file" id="importFile" accept=".json" hidden onchange="doImport(this)">
      <button class="btn btn-s" onclick="document.getElementById('importFile').click()">Choisir un fichier JSON</button>
    </div>

    <div class="card">
      <h3>${icon('cloud')} Sauvegarde cloud</h3>
      <p class="card-sub">
        Vos données partent dans le cloud à chaque modification.
        Statut : <span class="dot ${cloudOK ? 'on' : 'off'}"></span><strong>${cloudOK ? 'Connecté' : 'Non connecté'}</strong>${heure ? ` · dernière sauvegarde à ${heure}` : ''}
      </p>
      <div class="btn-group">
        <button class="btn btn-p" onclick="syncNow()">Forcer la synchro</button>
        <button class="btn btn-s" onclick="cloudRestore()">Restaurer depuis le cloud</button>
      </div>
    </div>

    <div class="card card-wide">
      <h3>${icon('shield')} Sécurité</h3>
      <p class="card-sub">Connecté en tant que <strong>${esc(curEmail)}</strong>.
        Changez votre mot de passe si vous pensez qu'une autre personne le connaît.</p>
      <div class="form-row">
        <div class="form-g"><label>Nouveau mot de passe</label><input id="pw1" type="password" autocomplete="new-password"></div>
        <div class="form-g"><label>Confirmer</label><input id="pw2" type="password" autocomplete="new-password"></div>
      </div>
      <button class="btn btn-p" onclick="changePassword()">Changer le mot de passe</button>
    </div>
`;
}

/* Les douze derniers mois, du plus recent au plus ancien. Suffisant pour
   rééditer un rapport passé sans transformer le champ en calendrier. */
function moOptions(sel) {
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 0; i < 12; i++) {
    const ym = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    out.push('<option value="' + ym + '"' + (ym === sel ? ' selected' : '') + '>'
             + moLabel(ym) + '</option>');
    d.setMonth(d.getMonth() - 1);
  }
  return out.join('');
}
