// ========================
// VARIABLES & ETAT
// ========================
let typeOcr = 'depense';
let typeManuel = 'depense';
let selectedImage = null;
let chartCategories = null;
let chartMensuel = null;
let chartSolde = null;

const MOIS_NOMS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const CAT_LABELS = {
  alimentation:'Alimentation', vetements:'Vêtements', cadeaux:'Cadeaux', essence:'Essence',
  logement:'Logement', transport:'Transport', loisirs:'Loisirs', sante:'Santé',
  salaire:'Salaire / Revenus', autre:'Autre'
};
const CAT_COLORS = {
  alimentation:'#ff9800', vetements:'#795548', cadeaux:'#ffeb3b', essence:'#607d8b',
  logement:'#2196f3', transport:'#9c27b0', loisirs:'#e91e63', sante:'#f44336',
  salaire:'#4caf50', autre:'#9e9e9e'
};

// ========================
// STOCKAGE (LocalStorage)
// ========================
function loadOperations() {
  try { return JSON.parse(localStorage.getItem('operations')) || []; }
  catch { return []; }
}
function saveOperations(ops) {
  localStorage.setItem('operations', JSON.stringify(ops));
}

// ========================
// NAVIGATION
// ========================
function showTab(tab) {
  const screens = ['screen-scan','screen-validate','screen-manuel','screen-historique','screen-graphiques'];
  const navs = ['nav-scan','nav-manuel','nav-historique','nav-graphiques'];
  
  screens.forEach(id => document.getElementById(id).classList.add('hidden'));
  navs.forEach(id => document.getElementById(id).classList.remove('active'));

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
  } else if (tab === 'graphiques') {
    document.getElementById('screen-graphiques').classList.remove('hidden');
    document.getElementById('nav-graphiques').classList.add('active');
    initGraphiques();
  }
}

function setType(ctx, t) {
  if(ctx === 'ocr') {
    typeOcr = t;
    document.getElementById('type-depense-ocr').className = t === 'depense' ? 'selected-depense' : '';
    document.getElementById('type-entree-ocr').className = t === 'entree' ? 'selected-entree' : '';
  } else {
    typeManuel = t;
    document.getElementById('type-depense-m').className = t === 'depense' ? 'selected-depense' : '';
    document.getElementById('type-entree-m').className = t === 'entree' ? 'selected-entree' : '';
  }
}

// ========================
// SCAN & OCR
// ========================
const fileInput = document.getElementById('file-input');
const btnOcr = document.getElementById('btn-ocr');
const ocrStatus = document.getElementById('ocr-status');

document.getElementById('btn-choose').addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if(!file) return;
  selectedImage = file;
  
  const reader = new FileReader();
  reader.onload = ev => {
    const p = document.getElementById('preview');
    p.innerHTML = '';
    const img = document.createElement('img');
    img.src = ev.target.result;
    p.appendChild(img);
    btnOcr.disabled = false;
  };
  reader.readAsDataURL(file);
});

btnOcr.addEventListener('click', async () => {
  ocrStatus.textContent = 'Lecture en cours (Tesseract)...';
  btnOcr.disabled = true;
  
  try {
    const worker = await Tesseract.createWorker('fra');
    const { data: { text } } = await worker.recognize(selectedImage);
    await worker.terminate();
    
    document.getElementById('ocr-text').value = text;
    // Tentative d'extraction du montant (très basique)
    const prices = text.match(/\d+[\.,]\d{2}/g);
    if(prices) {
      document.getElementById('amount').value = prices[prices.length-1].replace(',', '.');
    }
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    
    ocrStatus.textContent = '';
    document.getElementById('screen-scan').classList.add('hidden');
    document.getElementById('screen-validate').classList.remove('hidden');
  } catch(e) {
    console.error(e);
    ocrStatus.textContent = 'Erreur lors de la lecture.';
    btnOcr.disabled = false;
  }
});

// ========================
// ENREGISTREMENT
// ========================
document.getElementById('btn-save').addEventListener('click', () => {
  const amount = parseFloat(document.getElementById('amount').value);
  const date = document.getElementById('date').value;
  if(!amount || !date) return alert('Veuillez saisir un montant et une date.');
  
  const ops = loadOperations();
  ops.push({
    id: Date.now(),
    type: typeOcr,
    amount: amount,
    date: date,
    category: document.getElementById('category').value,
    comment: document.getElementById('comment').value.trim()
  });
  saveOperations(ops);
  alert('Opération enregistrée !');
  showTab('scan');
});

document.getElementById('btn-save-manuel').addEventListener('click', () => {
  const amount = parseFloat(document.getElementById('m-amount').value);
  const date = document.getElementById('m-date').value;
  if(!amount || !date) return alert('Veuillez saisir un montant et une date.');
  
  const ops = loadOperations();
  ops.push({
    id: Date.now(),
    type: typeManuel,
    amount: amount,
    date: date,
    category: document.getElementById('m-category').value,
    comment: document.getElementById('m-comment').value.trim()
  });
  saveOperations(ops);
  alert('Opération enregistrée !');
  document.getElementById('m-amount').value = '';
  document.getElementById('m-comment').value = '';
});

// ========================
// HISTORIQUE
// ========================
function renderHistorique() {
  const ops = loadOperations();
  const container = document.getElementById('historique-container');
  
  // Calcul des totaux
  let tDep = 0, tEnt = 0;
  ops.forEach(o => {
    if(o.type === 'depense') tDep += o.amount;
    else tEnt += o.amount;
  });
  
  document.getElementById('total-depenses').textContent = `-${tDep.toFixed(2)} €`;
  document.getElementById('total-entrees').textContent = `+${tEnt.toFixed(2)} €`;
  const solde = tEnt - tDep;
  const sEl = document.getElementById('total-solde');
  sEl.textContent = `${solde >= 0 ? '+' : ''}${solde.toFixed(2)} €`;
  sEl.style.color = solde >= 0 ? '#388e3c' : '#d32f2f';

  if (ops.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">Aucune opération.</div>';
    return;
  }

  // Tri par date décroissante
  ops.sort((a,b) => b.date.localeCompare(a.date));

  let html = '<table><thead><tr><th>Date</th><th>Cat.</th><th>Montant</th><th></th></tr></thead><tbody>';
  ops.forEach(op => {
    const d = op.date.split('-');
    const badge = op.type === 'depense' ? 'badge-depense' : 'badge-entree';
    html += `<tr>
      <td>${d[2]}/${d[1]}</td>
      <td><span class="badge ${badge}">${CAT_LABELS[op.category]}</span><br><small>${op.comment}</small></td>
      <td style="color:${op.type==='depense'?'#d32f2f':'#388e3c'}">${op.type==='depense'?'-':'+'}${op.amount.toFixed(2)}</td>
      <td><button class="btn-suppr" onclick="supprimerOp(${op.id})">🗑️</button></td>
    </tr>`;
  });
  container.innerHTML = html + '</tbody></table>';
}

window.supprimerOp = function(id) {
  if(confirm('Supprimer cette opération ?')) {
    const ops = loadOperations().filter(o => o.id !== id);
    saveOperations(ops);
    renderHistorique();
  }
};

// ========================
// GRAPHIQUES
// ========================
function initGraphiques() {
  const ops = loadOperations();
  
  // 1. Dépenses par catégorie
  const depenses = ops.filter(o => o.type === 'depense');
  const catData = {};
  depenses.forEach(d => {
    catData[d.category] = (catData[d.category] || 0) + d.amount;
  });

  if(chartCategories) chartCategories.destroy();
  chartCategories = new Chart(document.getElementById('chart-categories'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(catData).map(c => CAT_LABELS[c]),
      datasets: [{
        data: Object.values(catData),
        backgroundColor: Object.keys(catData).map(c => CAT_COLORS[c])
      }]
    },
    options: { plugins: { title: { display: true, text: 'Répartition des dépenses' } } }
  });

  // 2. Évolution mensuelle
  const mensuel = {};
  ops.forEach(o => {
    const m = o.date.slice(0,7);
    if(!mensuel[m]) mensuel[m] = { dep:0, ent:0 };
    if(o.type === 'depense') mensuel[m].dep += o.amount;
    else mensuel[m].ent += o.amount;
  });
  const labels = Object.keys(mensuel).sort();

  if(chartMensuel) chartMensuel.destroy();
  chartMensuel = new Chart(document.getElementById('chart-mensuel'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Entrées', data: labels.map(l => mensuel[l].ent), backgroundColor: '#4caf50' },
        { label: 'Dépenses', data: labels.map(l => mensuel[l].dep), backgroundColor: '#f44336' }
      ]
    }
  });
}

// ========================
// INITIALISATION
// ========================
if('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js');
}

// Affichage initial
showTab('scan');
