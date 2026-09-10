/* =====================================================================
   MODALE — un seul conteneur reutilise par tous les formulaires
   ===================================================================== */

function openModal(title, html) {
  document.getElementById('modalT').textContent = title;
  document.getElementById('modalB').innerHTML = html;
  document.getElementById('modalOv').hidden = false;

  /* Le premier champ prend le focus : la saisie enchaine sans passer par
     la souris. Le delai laisse le navigateur peindre la modale. */
  setTimeout(function () {
    const f = document.querySelector('#modalB input, #modalB select, #modalB textarea');
    if (f) f.focus();
  }, 40);
}

function closeModal() {
  document.getElementById('modalOv').hidden = true;
  if (pendConf) { pendConf(false); pendConf = null; }
}

/* Confirmation. Renvoie une promesse resolue a true / false, ce qui permet
   d'ecrire : if (await showConfirm('...')) { ... } */
function showConfirm(msg, danger) {
  return new Promise(function (res) {
    pendConf = res;
    openModal('Confirmation',
      '<p style="margin-bottom:20px">' + msg + '</p>'
      + '<div class="modal-ft">'
      +   '<button class="btn btn-s" onclick="closeModal()">Annuler</button>'
      +   '<button class="btn ' + (danger === false ? 'btn-p' : 'btn-d') + '" onclick="resConf(true)">Confirmer</button>'
      + '</div>');
  });
}

function resConf(v) {
  document.getElementById('modalOv').hidden = true;
  if (pendConf) { pendConf(v); pendConf = null; }
}
