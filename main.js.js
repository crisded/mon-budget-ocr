let selectedImage = null;

const fileInput = document.getElementById('file-input');
const btnChoose = document.getElementById('btn-choose');
const btnOcr = document.getElementById('btn-ocr');
const preview = document.getElementById('preview');
const ocrStatus = document.getElementById('ocr-status');

const screenScan = document.getElementById('screen-scan');
const screenValidate = document.getElementById('screen-validate');

const ocrText = document.getElementById('ocr-text');
const amountInput = document.getElementById('amount');
const dateInput = document.getElementById('date');
const categorySelect = document.getElementById('category');
const commentInput = document.getElementById('comment');
const btnSave = document.getElementById('btn-save');
const btnBack = document.getElementById('btn-back');

btnChoose.addEventListener('click', () => {
  fileInput.click();
});

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

btnOcr.addEventListener('click', async () => {
  if (!selectedImage) return;

  ocrStatus.textContent = 'Lecture en cours...';
  btnOcr.disabled = true;

  try {
    const { createWorker } = Tesseract;
    const worker = await createWorker();
    await worker.loadLanguage('fra');
    await worker.initialize('fra');

    const imageDataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(selectedImage);
    });

    const { data: { text } } = await worker.recognize(imageDataUrl);
    await worker.terminate();

    ocrText.value = text;
    ocrStatus.textContent = 'Lecture terminée. Vérifie et complète les informations.';

    screenScan.classList.add('hidden');
    screenValidate.classList.remove('hidden');
  } catch (err) {
    console.error(err);
    ocrStatus.textContent = "Erreur pendant la lecture du ticket. Essaie avec une photo plus nette.";
    btnOcr.disabled = false;
  }
});

btnBack.addEventListener('click', () => {
  screenValidate.classList.add('hidden');
  screenScan.classList.remove('hidden');
  btnOcr.disabled = false;
});

// Stockage simple en localStorage
function loadOperations() {
  const raw = localStorage.getItem('operations');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function saveOperations(ops) {
  localStorage.setItem('operations', JSON.stringify(ops));
}

btnSave.addEventListener('click', () => {
  const amount = parseFloat(String(amountInput.value).replace(',', '.'));
  const date = dateInput.value;
  const category = categorySelect.value;
  const comment = commentInput.value.trim();

  if (!amount || !date) {
    alert('Merci de remplir au minimum le montant et la date.');
    return;
  }

  const ops = loadOperations();
  ops.push({
    id: Date.now(),
    amount,
    date,
    category,
    comment,
    ocrText: ocrText.value
  });
  saveOperations(ops);

  alert('Dépense enregistrée !');

  amountInput.value = '';
  dateInput.value = '';
  categorySelect.value = 'alimentation';
  commentInput.value = '';

  screenValidate.classList.add('hidden');
  screenScan.classList.remove('hidden');
  btnOcr.disabled = false;
});
