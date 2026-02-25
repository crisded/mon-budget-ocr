// ========================
// VARIABLES & ETAT
// ========================
let typeOcr = 'depense';
let typeManuel = 'depense';
let selectedImage = null;
let chartCategories = null;
let chartMensuel = null;

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
  
  screens.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.classList.add('hidden');
  });
  navs.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.classList.remove('active');
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
// SCAN & OCR (VERSION AMELIOREE)
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

async function preprocessImage(imageFile) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // On agrandit l'image pour une meilleure lecture des petits caractères
      const scale = 2;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      // On dessine l'image avec des filtres pour simuler un scanner
      ctx.filter = 'grayscale(1) contrast(2) brightness(1)';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // On récupère les données de l'image pour un traitement pixel par pixel (seuillage)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        // Si le pixel est gris clair, il devient blanc. Si c'est gris foncé, il devient noir.
        const threshold = 120;
        const v = avg > threshold ? 255 : 0;
        data[i] = data[i+1] = data[i+2] = v;
      }
      ctx.putImageData(imageData, 0, 0);
      
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = URL.createObjectURL(imageFile);
  });
}

btnOcr.addEventListener('click', async () => {
  ocrStatus.textContent = 'Préparation de l\'image (optimisation)...';
  btnOcr.disabled = true;
  
  try {
    const processedImage = await preprocessImage(selectedImage);
    ocrStatus.textContent = 'Lecture intelligente en cours...';
    
    // On utilise Tesseract avec des paramètres pour ne chercher que des chiffres et des mots français
    const worker = await Tesseract.createWorker('fra');
    const { data: { text } } = await worker.recognize(processedImage);
    await worker.terminate();
    
    document.getElementById('ocr-text').value = text;
    
    // Analyse du texte pour trouver le montant TTC
    // On nettoie le texte des caractères bizarres souvent lus par erreur
    const lines = text.split('
');
    let foundPrices = [];
    
    lines.forEach(line => {
      // On cherche les patterns type "24,50" ou "24.50" ou "TOTAL 24.50"
      const matches = line.match(/\d+[\s.,]+\d{2}/g);
      if (matches) {
        matches.forEach(m => {
          const val = parseFloat(m.replace(/\s/g, '').replace(',', '.'));
          if (!isNaN(val) && val < 5000) foundPrices.push(val);
        });
      }
    });

    if(foundPrices.length > 0) {
      // On prend le montant maximum car c'est généralement le TOTAL TTC
      const total = Math.max(...foundPrices);
      document.getElementById('amount').value = total.toFixed(2);
    }
    
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    ocrStatus.textContent = '';
    document.getElementById('screen-scan').classList.add('hidden');
    document.getElementById('screen-validate').classList.remove('hidden');
  } catch(e) {
    console.error(e);
    ocrStatus.textContent = 'Erreur. Essayez une photo plus nette.';
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
  renderHistorique();
});

// ========================
// HISTORIQUE
// ========================
function renderHistorique() {
  const ops = loadOperations();
  const container = document.getElementById('historique-container');
  if(!container) return;

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
  const canvasCat = document.getElementById('chart-categories');
  const canvasMen = document.getElementById('chart-mensuel');
  if(!canvasCat || !canvasMen) return;

  const depenses = ops.filter(o => o.type === 'depense');
  const catData = {};
  depenses.forEach(d => {
    catData[d.category] = (catData[d.category] || 0) + d.amount;
  });

  if(chartCategories) chartCategories.destroy();
  chartCategories = new Chart(canvasCat, {
    type: 'doughnut',
    data: {
      labels: Object.keys(catData).map(c => CAT_LABELS[c]),
      datasets: [{
        data: Object.values(catData),
        backgroundColor: Object.keys(catData).map(c => CAT_COLORS[c])
      }]
    },
    options: { 
      responsive: true,
      maintainAspectRatio: false,
      plugins: { title: { display: true, text: 'Dépenses par catégorie' } } 
    }
  });

  const mensuel = {};
  ops.forEach(o => {
    const m = o.date.slice(0,7);
    if(!mensuel[m]) mensuel[m] = { dep:0, ent:0 };
    if(o.type === 'depense') mensuel[m].dep += o.amount;
    else mensuel[m].ent += o.amount;
  });
  const labels = Object.keys(mensuel).sort();

  if(chartMensuel) chartMensuel.destroy();
  chartMensuel = new Chart(canvasMen, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Entrées', data: labels.map(l => mensuel[l].ent), backgroundColor: '#4caf50' },
        { label: 'Dépenses', data: labels.map(l => mensuel[l].dep), backgroundColor: '#f44336' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

// Initialisation
if('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js');
}
showTab('scan');
