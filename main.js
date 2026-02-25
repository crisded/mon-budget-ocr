// Types selectionnes
let typeOcr = 'depense';
let typeManuel = 'depense';
let selectedImage = null;

// --- Navigation entre onglets ---
function showTab(tab) {
  document.getElementById('screen-scan').classList.add('hidden');
  document.getElementById('screen-validate').classList.add('hidden');
  document.getElementById('screen-manuel').classList.add('hidden');
  document.getElementById('nav-scan').classList.remove('active');
  document.getElementById('nav-manuel').classList.remove('active');

  if (tab === 'scan') {
    document.getElementById('screen-scan').classList.remove('hidden');
    document.getElementById('nav-scan').classList.add('active');
  } else if (tab === 'manuel') {
    document.getElementById('screen-manuel').classList.remove('hidden');
    document.getElementById('nav-manuel').classList.add('active');
    // Pre-remplir la date du jour
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('m-date').value = today;
  }
}

// --- Gestion du type (depense / entree) ---
function setType(context, type) {
  if (context === 'ocr') {
    typeOcr = type;
    document.getElementById('type-depense-ocr').className = '';
    document.getElementById('type-entree-ocr').className = '';
    if (type === 'depense') {
      document.getElementById('type-depense-ocr').className = 'selected-depense';
    } else {
      document.getElementById('type-entree-ocr').className = 'selected-entree';
    }
  } else {
    typeManuel = type;
    document.getElementById('type-depense-m').className = '';
    document.getElementById('type-entree-m').className = '';
    if (type === 'depense') {
      document.getElementById('type-depense-m').className = 'selected-depense';
    } else {
      document.getElementById('type-entree-m').className = 'selected-entree';
    }
  }
}

// --- Stockage localStorage ---
function loadOperations() {
  const raw = localStorage.getItem('operations');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function saveOperations(ops) {
  localStorage.setItem('operations', JSON.stringify(ops));
}

// --- ECRAN SCAN : prise de photo ---
const fileInput = document.getElementById('file-input');
const btnChoose = document.getElementById('btn-choose');
const btnOcr = document.getElementById('btn-ocr');
const preview = document.getElementById('preview');
const ocrStatus = document.getElementById('ocr-status');

btnChoose.addEventListener('click', () => { fileInput.click(); });

fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  selectedImage = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    preview.innerHTML = '';
    const img = document.createElement('img');
    img.src = e.target.result;
    preview.appendChild(img);
  };
  reader.readAsDataURL(file);
  btnOcr.disabled = false;
});

// --- OCR ---
btnOcr.addEventListener('click', async () => {
  if (!selectedImage) return;
  ocrStatus.textContent = 'Lecture en cours...';
  btnOcr.disabled = true;
  try {
    const { createWorker } = Tesseract;
    const worker = await createWorker('fra');
    const imageDataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(selectedImage);
    });
    const { data: { text } } = await worker.recognize(imageDataUrl);
    await worker.terminate();
    document.getElementById('ocr-text').value = text;
    ocrStatus.textContent = 'Lecture terminee. Verifie et complete les infos.';
    // Pre-remplir la date du jour
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    // Afficher ecran validation
    document.getElementById('screen-scan').classList.add('hidden');
    document.getElementById('screen-validate').classList.remove('hidden');
  } catch (err) {
    console.error(err);
    ocrStatus.textContent = 'Erreur pendant la lecture. Essaie avec une photo plus nette.';
    btnOcr.disabled = false;
  }
});

// --- Retour au scan ---
document.getElementById('btn-back').addEventListener('click', () => {
  document.getElementById('screen-validate').classList.add('hidden');
  document.getElementById('screen-scan').classList.remove('hidden');
  btnOcr.disabled = false;
});

// --- Enregistrer depuis OCR ---
document.getElementById('btn-save').addEventListener('click', () => {
  const amount = parseFloat(String(document.getElementById('amount').value).replace(',', '.'));
  const date = document.getElementById('date').value;
  const category = document.getElementById('category').value;
  const comment = document.getElementById('comment').value.trim();
  if (!amount || !date) {
    alert('Merci de remplir au minimum le montant et la date.');
    return;
  }
  const ops = loadOperations();
  ops.push({
    id: Date.now(),
    type: typeOcr,
    amount,
    date,
    category,
    comment,
    source: 'ocr'
  });
  saveOperations(ops);
  alert((typeOcr === 'depense' ? 'Depense' : 'Entree') + ' enregistree !');
  document.getElementById('amount').value = '';
  document.getElementById('date').value = '';
  document.getElementById('category').value = 'alimentation';
  document.getElementById('comment').value = '';
  document.getElementById('ocr-text').value = '';
  typeOcr = 'depense';
  setType('ocr', 'depense');
  document.getElementById('screen-validate').classList.add('hidden');
  document.getElementById('screen-scan').classList.remove('hidden');
  document.getElementById('nav-scan').classList.add('active');
  document.getElementById('nav-manuel').classList.remove('active');
  btnOcr.disabled = false;
});

// --- Enregistrer depuis saisie manuelle ---
document.getElementById('btn-save-manuel').addEventListener('click', () => {
  const amount = parseFloat(String(document.getElementById('m-amount').value).replace(',', '.'));
  const date = document.getElementById('m-date').value;
  const category = document.getElementById('m-category').value;
  const comment = document.getElementById('m-comment').value.trim();
  if (!amount || !date) {
    alert('Merci de remplir au minimum le montant et la date.');
    return;
  }
  const ops = loadOperations();
  ops.push({
    id: Date.now(),
    type: typeManuel,
    amount,
    date,
    category,
    comment,
    source: 'manuel'
  });
  saveOperations(ops);
  alert((typeManuel === 'depense' ? 'Depense' : 'Entree') + ' enregistree !');
  document.getElementById('m-amount').value = '';
  document.getElementById('m-date').value = '';
  document.getElementById('m-category').value = 'alimentation';
  document.getElementById('m-comment').value = '';
  typeManuel = 'depense';
  setType('manuel', 'depense');
});

// --- Service Worker ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js');
  });
}
