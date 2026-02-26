// Icones par categorie
const ICONES = {
  Alimentation: '🛒', Transport: '🚗', Logement: '🏠',
  Loisirs: '🎮', Sante: '💊', Vetements: '👗',
  Salaire: '💼', Autre: '📦'
};
const COULEURS = {
  Alimentation: '#FF9800', Transport: '#2196F3', Logement: '#9C27B0',
  Loisirs: '#E91E63', Sante: '#4CAF50', Vetements: '#FF5722',
  Salaire: '#00BCD4', Autre: '#607D8B'
};

let typeActuel = 'depense';
let transactions = JSON.parse(localStorage.getItem('budget_transactions') || '[]');

function setType(type) {
  typeActuel = type;
  const btnDep = document.getElementById('btn-dep');
  const btnRev = document.getElementById('btn-rev');
  if (type === 'depense') {
    btnDep.className = 'active-dep';
    btnRev.className = '';
  } else {
    btnRev.className = 'active-rev';
    btnDep.className = '';
  }
}

function ajouterTransaction() {
  const montant = parseFloat(document.getElementById('montant').value);
  const description = document.getElementById('description').value.trim();
  const categorie = document.getElementById('categorie').value;

  if (!montant || montant <= 0) {
    alert('Veuillez entrer un montant valide.');
    return;
  }
  if (!description) {
    alert('Veuillez entrer une description.');
    return;
  }

  const transaction = {
    id: Date.now(),
    type: typeActuel,
    montant: montant,
    description: description,
    categorie: categorie,
    date: new Date().toLocaleDateString('fr-FR')
  };

  transactions.unshift(transaction);
  sauvegarder();
  afficher();

  // Reinitialiser le formulaire
  document.getElementById('montant').value = '';
  document.getElementById('description').value = '';
}

function supprimerTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  sauvegarder();
  afficher();
}

function sauvegarder() {
  localStorage.setItem('budget_transactions', JSON.stringify(transactions));
}

function formaterMontant(montant) {
  return montant.toFixed(2).replace('.', ',') + ' €';
}

function afficher() {
  // Calcul solde
  let totalRev = 0, totalDep = 0;
  transactions.forEach(t => {
    if (t.type === 'revenu') totalRev += t.montant;
    else totalDep += t.montant;
  });
  const solde = totalRev - totalDep;

  const elSolde = document.getElementById('solde');
  elSolde.textContent = formaterMontant(solde);
  elSolde.className = 'montant ' + (solde >= 0 ? 'positif' : 'negatif');
  document.getElementById('total-rev').textContent = formaterMontant(totalRev);
  document.getElementById('total-dep').textContent = formaterMontant(totalDep);

  // Liste des transactions
  const liste = document.getElementById('liste-transactions');
  if (transactions.length === 0) {
    liste.innerHTML = '<div class="vide">Aucune transaction pour le moment</div>';
    return;
  }

  liste.innerHTML = transactions.map(t => {
    const icone = ICONES[t.categorie] || '📦';
    const couleur = COULEURS[t.categorie] || '#607D8B';
    const signe = t.type === 'depense' ? '-' : '+';
    const classe = t.type === 'depense' ? 'dep' : 'rev';
    return `
      <div class="transaction-item">
        <div class="transaction-icone" style="background:${couleur}22;">${icone}</div>
        <div class="transaction-info">
          <div class="desc">${t.description}</div>
          <div class="cat-date">${t.categorie} • ${t.date}</div>
        </div>
        <div class="transaction-montant ${classe}">${signe}${formaterMontant(t.montant)}</div>
        <button class="btn-suppr" onclick="supprimerTransaction(${t.id})">×</button>
      </div>
    `;
  }).join('');
}

// Enregistrement du service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .catch(err => console.log('SW non enregistre:', err));
  });
}

// Affichage initial
afficher();
