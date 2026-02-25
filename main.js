// ========================
// VARIABLES GLOBALES
// ========================
let typeOcr = 'depense';
let typeManuel = 'depense';
let selectedImage = null;

// ========================
// STOCKAGE
// ========================
function loadOperations() {
  try { return JSON.parse(localStorage.getItem('operations')) || []; }
  catch { return []; }
}
function saveOperations(ops) {
  localStorage.setItem('operations', JSON.stringify(ops));
}

// ========================
// NAVIGATION ONGLETS
// ========================
function showTab(tab) {
  ['screen-scan','screen-validate','screen-manuel','screen-historique'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  ['nav-scan','nav-manuel','nav-historique'].forEach(id => {
    document.getElementById(id).classList.remove('active');
  });
  if (tab === 'scan') {
    document.getElementById('screen-scan').classList.remove('hidden');
    document.getElementById('nav-scan').classList.add('active');
  } else if (tab === 'manuel') {
    document.getElementById('screen-manuel').classList.remove('hidden');
    document.getElementById('nav-manuel').classList.add('active');
    document.getElementById('m-date').value = new Date().toISOString().split('T')[0];
  } else if (tab === 'historique') {
    document.getElementById('screen-historique').classList.remove('hidden');
    document.getElementById('nav-historique').classList.add('active');
    renderHistorique();
  }
}

// ========================
// TYPE DEPENSE / ENTREE
// ========================
function setType(context, type) {
  if (context === 'ocr') {
    typeOcr = type;
    document.getElementById('type-depense-ocr').className = type === 'depense' ? 'selected-depense' : '';
    document.getElementById('type-entree-ocr').className = type === 'entree' ? 'selected-entree' : '';
  } else {
    typeManuel = type;
    document.getElementById('type-depense-m').className = type === 'depense' ? 'selected-depense' : '';
    document.getElementById('type-entree-m').className = type === 'entree' ? 'selected-entree' : '';
  }
}

// ========================
// HISTORIQUE
// ========================
const MOIS_NOMS = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre'];
const CAT_LABELS = {
  alimentation: 'Alimentation', logement: 'Logement', transport: 'Transport',
  loisirs: 'Loisirs', sante: 'Sante', salaire: 'Salaire / Revenus', autre: 'Autre'
};

function renderHistorique() {
  const ops = loadOperations();
  const filtreMois = document.getElementById('filtre-mois').value;
  const filtreCat = document.getElementById('filtre-categorie').value;

  // Remplir le selecteur de mois avec les mois disponibles
  const moisDispo = [...new Set(ops.map(o => o.date.slice(0,7)))].sort().reverse();
  const filtreMoisEl = document.getElementById('filtre-mois');
  const valeurActuelle = filtreMoisEl.value;
  filtreMoisEl.innerHTML = '<option value="">Tous les mois</option>';
  moisDispo.forEach(m => {
    const [annee, moisNum] = m.split('-');
    const label = MOIS_NOMS[parseInt(moisNum)-1] + ' ' + annee;
    filtreMoisEl.innerHTML += '<option value="' + m + '"' + (m === valeurActuelle ? ' selected' : '') + '>' + label + '</option>';
  });

  // Filtrer
  let filtered = ops;
  if (filtreMois) filtered = filtered.filter(o => o.date.startsWith(filtreMois));
  if (filtreCat) filtered = filtered.filter(o => o.category === filtreCat);

  // Trier du plus recent au plus ancien
  filtered = filtered.sort((a, b) => b.date.localeCompare(a.date));

  // Calculer totaux
  let totalDep = 0, totalEnt = 0;
  filtered.forEach(o => {
    if (o.type === 'depense') totalDep += o.amount;
    else totalEnt += o.amount;
  });
  const solde = totalEnt - totalDep;

  document.getElementById('total-depenses').textContent = '-' + totalDep.toFixed(2) + ' euro';
  document.getElementById('total-entrees').textContent = '+' + totalEnt.toFixed(2) + ' euro';
  const soldeEl = document.getElementById('total-solde');
  soldeEl.textContent = (solde >= 0 ? '+' : '') + solde.toFixed(2) + ' euro';
  soldeEl.style.color = solde >= 0 ? '#388e3c' : '#d32f2f';

  // Afficher tableau
  const container = document.getElementById('historique-container');
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-msg">Aucune operation pour ces filtres.</div>';
    return;
  }

  let html = '<table><thead><tr><th>Date</th><th>Type</th><th>Categorie</th><th>Montant</th><th>Commentaire</th><th></th></tr></thead><tbody>';
  filtered.forEach(op => {
    const d = op.date.split('-');
    const dateAff = d[2] + '/' + d[1] + '/' + d[0];
    const badge = op.type === 'depense'
      ? '<span class="badge badge-depense">Dep.</span>'
      : '<span class="badge badge-entree">Entr.</span>';
    const montantAff = op.type === 'depense'
      ? '<span style="color:#d32f2f">-' + op.amount.toFixed(2) + ' e</span>'
      : '<span style="color:#388e3c">+' + op.amount.toFixed(2) + ' e</span>';
    const cat = CAT_LABELS[op.category] || op.category;
    const comment = op.comment || '-';
    html += '<tr>';
    html += '<td>' + dateAff + '</td>';
    html += '<td>' + badge + '</td>';
    html += '<td>' + cat + '</td>';
    html += '<td>' + montantAff + '</td>';
    html += '<td style="max-width:90px;word-break:break-word">' + comment + '</td>';
    html += '<td><button class="btn-suppr" onclick="supprimerOp(' + op.id + ')" title="Supprimer">&#x1F5D1;</button></td>';
    html += '</tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

function supprimerOp(id) {
  if (!confirm('Supprimer cette operation ?')) return;
  const ops = loadOperations().filter(o => o.id !== id);
  saveOperations(ops);
  renderHistorique();
}

// Filtres dynamiques
document.getElementById('filtre-mois').addEventListener('change', renderHistorique);
document.getElementById('filtre-categorie').addEventListener('change', renderHistorique);

// ========================
// SCAN / OCR
// ========================
const fileInput = document.getElementById('file-input');
const btnChoose = document.getElementById('btn-choose');
const btnOcr = document.getElementById('btn-ocr');
const preview = document.getElementById('preview');
const ocrStatus = document.getElementById('ocr-status');

btnChoose.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  selectedImage = file;
  const reader = new FileReader();
  reader.onload = (ev) => {
    preview.innerHTML = '';
    const img = document.createElement('img');
    img.src = ev.target.result;
    preview.appendChild(img);
  };
  reader.readAsDataURL(file);
  btnOcr.disabled = false;
});

btnOcr.addEventListener('click', async () => {
  if (!selectedImage) return;
  ocrStatus.textContent = 'Lecture en cours...';
  btnOcr.disabled = true;
  try {
    const { createWorker } = Tesseract;
    const worker = await createWorker('fra');
    const imageDataUrl = await new Promise(resolve => {
      const r = new FileReader();
      r.onload = ev => resolve(ev.target.result);
      r.readAsDataURL(selectedImage);
    });
    const { data: { text } } = await worker.recognize(imageDataUrl);
    await worker.terminate();
    document.getElementById('ocr-text').value = text;
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    ocrStatus.textContent = 'Lecture terminee. Verifie et complete les infos.';
    document.getElementById('screen-scan').classList.add('hidden');
    document.getElementById('screen-validate').classList.remove('hidden');
  } catch (err) {
    console.error(err);
    ocrStatus.textContent = 'Erreur de lecture. Essaie avec une photo plus nette.';
    btnOcr.disabled = false;
  }
});

document.getElementById('btn-back').addEventListener('click', () => {
  document.getElementById('screen-validate').classList.add('hidden');
  document.getElementById('screen-scan').classList.remove('hidden');
  btnOcr.disabled = false;
});

// ========================
// ENREGISTREMENT OCR
// ========================
document.getElementById('btn-save').addEventListener('click', () => {
  const amount = parseFloat(String(document.getElementById('amount').value).replace(',','.'));
  const date = document.getElementById('date').value;
  if (!amount || !date) { alert('Remplis au minimum le montant et la date.'); return; }
  const ops = loadOperations();
  ops.push({
    id: Date.now(), type: typeOcr, amount, date,
    category: document.getElementById('category').value,
    comment: document.getElementById('comment').value.trim(),
    source: 'ocr'
  });
  saveOperations(ops);
  alert((typeOcr === 'depense' ? 'Depense' : 'Entree') + ' enregistree !');
  ['amount','date','comment'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('category').value = 'alimentation';
  document.getElementById('ocr-text').value = '';
  typeOcr = 'depense';
  setType('ocr','depense');
  document.getElementById('screen-validate').classList.add('hidden');
  document.getElementById('screen-scan').classList.remove('hidden');
  document.getElementById('nav-scan').classList.add('active');
  document.getElementById('nav-manuel').classList.remove('active');
  document.getElementById('nav-historique').classList.remove('active');
  btnOcr.disabled = false;
});

// ========================
// ENREGISTREMENT MANUEL
// ========================
document.getElementById('btn-save-manuel').addEventListener('click', () => {
  const amount = parseFloat(String(document.getElementById('m-amount').value).replace(',','.'));
  const date = document.getElementById('m-date').value;
  if (!amount || !date) { alert('Remplis au minimum le montant et la date.'); return; }
  const ops = loadOperations();
  ops.push({
    id: Date.now(), type: typeManuel, amount, date,
    category: document.getElementById('m-category').value,
    comment: document.getElementById('m-comment').value.trim(),
    source: 'manuel'
  });
  saveOperations(ops);
  alert((typeManuel === 'depense' ? 'Depense' : 'Entree') + ' enregistree !');
  ['m-amount','m-date','m-comment'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('m-category').value = 'alimentation';
  typeManuel = 'depense';
  setType('manuel','depense');
});

// ========================
// SERVICE WORKER
// ========================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));
}
