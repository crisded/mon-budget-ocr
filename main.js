// ========================
// VARIABLES & CHARTS
// ========================
let typeOcr = 'depense';
let typeManuel = 'depense';
let selectedImage = null;
let chartCategories = null;
let chartMensuel = null;
let chartSolde = null;

const MOIS_NOMS = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Décembre'];
const CAT_LABELS = {
  alimentation:'Alimentation', vetements:'Vêtements', cadeaux:'Cadeaux', essence:'Essence',
  logement:'Logement', transport:'Transport', loisirs:'Loisirs', sante:'Sante',
  salaire:'Salaire / Revenus', autre:'Autre'
};
const CAT_COLORS = {
  alimentation:'#ff9800', vetements:'#795548', cadeaux:'#ffeb3b', essence:'#607d8b',
  logement:'#2196f3', transport:'#9c27b0', loisirs:'#e91e63', sante:'#f44336',
  salaire:'#4caf50', autre:'#9e9e9e'
};

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
// NAVIGATION
// ========================
function showTab(tab) {
  ['screen-scan','screen-validate','screen-manuel','screen-historique','screen-graphiques'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  ['nav-scan','nav-manuel','nav-historique','nav-graphiques'].forEach(id => {
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
  } else if (tab === 'graphiques') {
    document.getElementById('screen-graphiques').classList.remove('hidden');
    document.getElementById('nav-graphiques').classList.add('active');
    initGraphiques();
  }
}

// ========================
// HISTORIQUE
// ========================
function renderHistorique() {
  const ops = loadOperations();
  const filtreMois = document.getElementById('filtre-mois').value;
  const filtreCat = document.getElementById('filtre-categorie').value;

  const moisDispo = [...new Set(ops.map(o => o.date.slice(0,7)))].sort().reverse();
  const filtreMoisEl = document.getElementById('filtre-mois');
  const valMois = filtreMoisEl.value;
  filtreMoisEl.innerHTML = '<option value="">Tous les mois</option>';
  moisDispo.forEach(m => {
    const [a, mn] = m.split('-');
    filtreMoisEl.innerHTML += `<option value="${m}" ${m===valMois?'selected':''}>${MOIS_NOMS[parseInt(mn)-1]} ${a}</option>`;
  });

  let filtered = ops;
  if (filtreMois) filtered = filtered.filter(o => o.date.startsWith(filtreMois));
  if (filtreCat) filtered = filtered.filter(o => o.category === filtreCat);
  filtered.sort((a,b) => b.date.localeCompare(a.date));

  let tDep = 0, tEnt = 0;
  filtered.forEach(o => { if (o.type === 'depense') tDep += o.amount; else tEnt += o.amount; });
  document.getElementById('total-depenses').textContent = `-${tDep.toFixed(2)} e`;
  document.getElementById('total-entrees').textContent = `+${tEnt.toFixed(2)} e`;
  const s = tEnt - tDep;
  const sEl = document.getElementById('total-solde');
  sEl.textContent = `${s>=0?'+':''}${s.toFixed(2)} e`;
  sEl.style.color = s>=0 ? '#388e3c' : '#d32f2f';

  const container = document.getElementById('historique-container');
  if (!filtered.length) { container.innerHTML = '<div class="empty-msg">Aucune operation.</div>'; return; }

  let h = '<table><thead><tr><th>Date</th><th>Cat.</th><th>Montant</th><th></th></tr></thead><tbody>';
  filtered.forEach(op => {
    const d = op.date.split('-');
    const badge = op.type==='depense' ? 'badge-depense' : 'badge-entree';
    h += `<tr>
      <td>${d[2]}/${d[1]}</td>
      <td><span class="badge ${badge}">${CAT_LABELS[op.category] || op.category}</span><br><small>${op.comment||''}</small></td>
      <td style="color:${op.type==='depense'?'#d32f2f':'#388e3c'}">${op.type==='depense'?'-':'+'}${op.amount.toFixed(2)}</td>
      <td><button class="btn-suppr" onclick="supprimerOp(${op.id})">&#x1F5D1;</button></td>
    </tr>`;
  });
  container.innerHTML = h + '</tbody></table>';
}

function supprimerOp(id) {
  if (confirm('Supprimer ?')) { saveOperations(loadOperations().filter(o => o.id !== id)); renderHistorique(); }
}

// ========================
// GRAPHIQUES
// ========================
function initGraphiques() {
  const ops = loadOperations();
  const filtreMois = document.getElementById('graph-filtre-mois').value;
  const filtreSoldeMois = document.getElementById('graph-filtre-solde').value;

  const moisDispo = [...new Set(ops.map(o => o.date.slice(0,7)))].sort().reverse();
  const fM = document.getElementById('graph-filtre-mois');
  const vM = fM.value;
  fM.innerHTML = '<option value="">Tous les mois</option>';
  moisDispo.forEach(m => {
    const [a, mn] = m.split('-');
    fM.innerHTML += `<option value="${m}" ${m===vM?'selected':''}>${MOIS_NOMS[parseInt(mn)-1]} ${a}</option>`;
  });

  const fS = document.getElementById('graph-filtre-solde');
  const vS = fS.value;
  fS.innerHTML = '<option value="">Choisir un mois...</option>';
  moisDispo.forEach(m => {
    const [a, mn] = m.split('-');
    fS.innerHTML += `<option value="${m}" ${m===vS?'selected':''}>${MOIS_NOMS[parseInt(mn)-1]} ${a}</option>`;
  });

  let dataCat = ops;
  if (filtreMois) dataCat = dataCat.filter(o => o.date.startsWith(filtreMois));
  dataCat = dataCat.filter(o => o.type === 'depense');
  const cats = {};
  dataCat.forEach(o => { cats[o.category] = (cats[o.category] || 0) + o.amount; });

  if (chartCategories) chartCategories.destroy();
  chartCategories = new Chart(document.getElementById('chart-categories'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(cats).map(c => CAT_LABELS[c] || c),
      datasets: [{ data: Object.values(cats), backgroundColor: Object.keys(cats).map(c => CAT_COLORS[c] || '#ccc') }]
    }
  });

  const mensuel = {};
  ops.forEach(o => {
    const m = o.date.slice(0,7);
    if (!mensuel[m]) mensuel[m] = { dep:0, ent:0 };
    if (o.type==='depense') mensuel[m].dep += o.amount; else mensuel[m].ent += o.amount;
  });
  const labelsM = Object.keys(mensuel).sort();

  if (chartMensuel) chartMensuel.destroy();
  chartMensuel = new Chart(document.getElementById('chart-mensuel'), {
    type: 'bar',
    data: {
      labels: labelsM.map(l => { const [a,mn]=l.split('-'); return MOIS_NOMS[parseInt(mn)-1].slice(0,3); }),
      datasets: [
        { label:'Entrées', data:labelsM.map(l => mensuel[l].ent), backgroundColor:'#4caf50' },
        { label:'Dépenses', data:labelsM.map(l => mensuel[l].dep), backgroundColor:'#f44336' }
      ]
    }
  });

  if (chartSolde) chartSolde.destroy();
  if (filtreSoldeMois) {
    const dataSolde = ops.filter(o => o.date.startsWith(filtreSoldeMois)).sort((a,b)=>a.date.localeCompare(b.date));
    const jours = {};
    dataSolde.forEach(o => {
      const j = parseInt(o.date.split('-')[2]);
      jours[j] = (jours[j] || 0) + (o.type==='entree' ? o.amount : -o.amount);
    });
    let cumul = 0;
    const labelsJ = [], valsJ = [];
    const dernierJour = new Date(filtreSoldeMois.split('-')[0], filtreSoldeMois.split('-')[1], 0).getDate();
    for(let i=1; i<=dernierJour; i++) {
      cumul += (jours[i] || 0);
      labelsJ.push(i);
      valsJ.push(cumul);
    }
    chartSolde = new Chart(document.getElementById('chart-solde'), {
      type: 'line',
      data: {
        labels: labelsJ,
        datasets: [{ label:'Solde', data:valsJ, borderColor:'#1976d2', tension:0.1, fill:true, backgroundColor:'rgba(25,118,210,0.1)' }]
      }
    });
  }
}

document.getElementById('graph-filtre-mois').addEventListener('change', initGraphiques);
document.getElementById('graph-filtre-solde').addEventListener('change', initGraphiques);

// ========================
// RESTE (OCR/SAVE)
// ========================
function setType(ctx, t) {
  if(ctx==='ocr') { typeOcr=t; document.getElementById('type-depense-ocr').className=t==='depense'?'selected-depense':''; document.getElementById('type-entree-ocr').className=t==='entree'?'selected-entree':''; }
  else { typeManuel=t; document.getElementById('type-depense-m').className=t==='depense'?'selected-depense':''; document.getElementById('type-entree-m').className=t==='entree'?'selected-entree':''; }
}

const fileInput = document.getElementById('file-input');
const btnOcr = document.getElementById('btn-ocr');
document.getElementById('btn-choose').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0]; if(!file) return; selectedImage=file;
  const r = new FileReader(); r.onload = ev => {
    const p = document.getElementById('preview'); p.innerHTML='';
    const img=document.createElement('img'); img.src=ev.target.result; p.appendChild(img);
  }; r.readAsDataURL(file); btnOcr.disabled=false;
});

btnOcr.addEventListener('click', async () => {
  const s = document.getElementById('ocr-status'); s.textContent='Lecture...'; btnOcr.disabled=true;
  try {
    const { createWorker } = Tesseract; const w = await createWorker('fra');
    const img = await new Promise(res => { const r=new FileReader(); r.onload=ev=>res(ev.target.result); r.readAsDataURL(selectedImage); });
    const { data:{text} } = await w.recognize(img); await w.terminate();
    document.getElementById('ocr-text').value=text;
    document.getElementById('date').value=new Date().toISOString().split('T')[0];
    s.textContent='Terminé.'; document.getElementById('screen-scan').classList.add('hidden'); document.getElementById('screen-validate').classList.remove('hidden');
  } catch(e) { s.textContent='Erreur.'; btnOcr.disabled=false; }
});

document.getElementById('btn-save').addEventListener('click', () => {
  const a = parseFloat(document.getElementById('amount').value);
  const d = document.getElementById('date').value;
  if(!a || !d) return alert('Montant/Date ?');
  const ops = loadOperations();
  ops.push({ id:Date.now(), type:typeOcr, amount:a, date:d, category:document.getElementById('category').value, comment:document.getElementById('comment').value.trim() });
  saveOperations(ops); alert('Ok !'); showTab('scan');
});

document.getElementById('btn-save-manuel').addEventListener('click', () => {
  const a = parseFloat(document.getElementById('m-amount').value);
  const d = document.getElementById('m-date').value;
  if(!a || !d) return alert('Montant/Date ?');
  const ops = loadOperations();
  ops.push({ id:Date.now(), type:typeManuel, amount:a, date:d, category:document.getElementById('m-category').value, comment:document.getElementById('m-comment').value.trim() });
  saveOperations(ops); alert('Ok !');
});

document.getElementById('filtre-mois').addEventListener('change', renderHistorique);
document.getElementById('filtre-categorie').addEventListener('change', renderHistorique);

if('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js');
