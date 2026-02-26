// Icones par categorie
const ICONES = {
  Alimentation: '🛒', Transport: '🚗', Logement: '🏠',
  Loisirs: '🎮', Sante: '💊', Vetements: '👕',
  Cadeau: '🎁', Assurance: '🛡️', Abonnement: '📱',
  Electricite: '⚡', Gaz: '🔥', Voiture: '🚙',
  Vacances: '✈️', Salaire: '💼', Autre: '📦'
};
const COULEURS = {
  Alimentation: '#FF9800', Transport: '#2196F3', Logement: '#9C27B0',
  Loisirs: '#E91E63', Sante: '#4CAF50', Vetements: '#FF5722',
  Cadeau: '#F06292', Assurance: '#455A64', Abonnement: '#7B1FA2',
  Electricite: '#FFC107', Gaz: '#FF7043', Voiture: '#0288D1',
  Vacances: '#26A69A', Salaire: '#00BCD4', Autre: '#607D8B'
};

let typeActuel = 'depense';
let transactions = JSON.parse(localStorage.getItem('budget_transactions') || '[]');
let chartCamembert = null;
let chartCourbe = null;

window.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('date-transaction').value = today;
});

function setType(type) {
  typeActuel = type;
  const btnDep = document.getElementById('btn-dep');
  const btnRev = document.getElementById('btn-rev');
  if (type === 'depense') {
    btnDep.className = 'active-dep'; btnRev.className = '';
  } else {
    btnRev.className = 'active-rev'; btnDep.className = '';
  }
}

function ajouterTransaction() {
  const montant = parseFloat(document.getElementById('montant').value);
  const description = document.getElementById('description').value.trim();
  const categorie = document.getElementById('categorie').value;
  const dateValeur = document.getElementById('date-transaction').value;
  if (!montant || montant <= 0) { alert('Veuillez entrer un montant valide.'); return; }
  if (!description) { alert('Veuillez entrer une description.'); return; }
  if (!dateValeur) { alert('Veuillez choisir une date.'); return; }
  const [annee, mois, jour] = dateValeur.split('-');
  const dateAffichee = `${jour}/${mois}/${annee}`;
  const transaction = { id: Date.now(), type: typeActuel, montant, description, categorie, date: dateAffichee, dateISO: dateValeur };
  transactions.push(transaction);
  sauvegarder();
  afficher();
  document.getElementById('montant').value = '';
  document.getElementById('description').value = '';
  document.getElementById('date-transaction').value = new Date().toISOString().split('T')[0];
}

function supprimerTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  sauvegarder(); afficher();
}

function sauvegarder() {
  localStorage.setItem('budget_transactions', JSON.stringify(transactions));
}

function formaterMontant(montant) {
  return montant.toFixed(2).replace('.', ',') + ' €';
}

function formaterDateLisible(dateISO) {
  if (!dateISO) return '';
  const [annee, mois, jour] = dateISO.split('-');
  const moisNoms = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  return `${parseInt(jour)} ${moisNoms[parseInt(mois)-1]} ${annee}`;
}

function mettreAJourGraphiques() {
  // --- CAMEMBERT : depenses par categorie ---
  const depParCat = {};
  transactions.filter(t => t.type === 'depense').forEach(t => {
    depParCat[t.categorie] = (depParCat[t.categorie] || 0) + t.montant;
  });
  const labels = Object.keys(depParCat);
  const data = Object.values(depParCat);
  const bgColors = labels.map(l => COULEURS[l] || '#607D8B');

  if (chartCamembert) chartCamembert.destroy();
  const ctxC = document.getElementById('chartCamembert').getContext('2d');
  if (labels.length > 0) {
    chartCamembert = new Chart(ctxC, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: bgColors, borderWidth: 2, borderColor: '#fff' }] },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 10 } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed.toFixed(2).replace('.',',')} €` } }
        }
      }
    });
  } else {
    ctxC.clearRect(0, 0, ctxC.canvas.width, ctxC.canvas.height);
    ctxC.font = '14px sans-serif'; ctxC.fillStyle = '#bbb'; ctxC.textAlign = 'center';
    ctxC.fillText('Aucune dépense enregistrée', ctxC.canvas.width/2, 80);
  }

  // --- COURBE : evolution du solde par date ---
  const soldeparDate = {};
  const triees = [...transactions].sort((a,b) => (a.dateISO||'').localeCompare(b.dateISO||''));
  let cumulSolde = 0;
  triees.forEach(t => {
    cumulSolde += t.type === 'revenu' ? t.montant : -t.montant;
    soldeparDate[t.dateISO || t.date] = cumulSolde;
  });
  const datesLabels = Object.keys(soldeparDate).map(d => {
    if (d && d.includes('-')) { const [a,m,j] = d.split('-'); return `${j}/${m}/${a}`; }
    return d;
  });
  const soldeValeurs = Object.values(soldeparDate);

  if (chartCourbe) chartCourbe.destroy();
  const ctxL = document.getElementById('chartCourbe').getContext('2d');
  if (soldeValeurs.length > 0) {
    chartCourbe = new Chart(ctxL, {
      type: 'line',
      data: {
        labels: datesLabels,
        datasets: [{
          label: 'Solde (€)',
          data: soldeValeurs,
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33,150,243,0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: soldeValeurs.map(v => v >= 0 ? '#4CAF50' : '#f44336')
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { ticks: { callback: v => v.toFixed(0)+'€', font: { size: 11 } } },
          x: { ticks: { font: { size: 10 }, maxRotation: 45 } }
        }
      }
    });
  } else {
    ctxL.clearRect(0, 0, ctxL.canvas.width, ctxL.canvas.height);
    ctxL.font = '14px sans-serif'; ctxL.fillStyle = '#bbb'; ctxL.textAlign = 'center';
    ctxL.fillText('Aucune transaction enregistrée', ctxL.canvas.width/2, 80);
  }
}

function afficher() {
  let totalRev = 0, totalDep = 0;
  transactions.forEach(t => {
    if (t.type === 'revenu') totalRev += t.montant; else totalDep += t.montant;
  });
  const solde = totalRev - totalDep;
  const elSolde = document.getElementById('solde');
  elSolde.textContent = formaterMontant(solde);
  elSolde.className = 'montant ' + (solde >= 0 ? 'positif' : 'negatif');
  document.getElementById('total-rev').textContent = formaterMontant(totalRev);
  document.getElementById('total-dep').textContent = formaterMontant(totalDep);

  mettreAJourGraphiques();

  const liste = document.getElementById('liste-transactions');
  if (transactions.length === 0) { liste.innerHTML = '<div class="vide">Aucune transaction pour le moment</div>'; return; }

  const triees = [...transactions].sort((a, b) => {
    const da = a.dateISO || '0000-00-00', db = b.dateISO || '0000-00-00';
    if (db !== da) return db.localeCompare(da);
    return (a.categorie||'').localeCompare(b.categorie||'');
  });

  let html = '', dateCourante = null, categorieCourante = null;
  triees.forEach(t => {
    const icone = ICONES[t.categorie] || '📦';
    const couleur = COULEURS[t.categorie] || '#607D8B';
    const signe = t.type === 'depense' ? '-' : '+';
    const classe = t.type === 'depense' ? 'dep' : 'rev';
    const dateISO = t.dateISO || '';
    if (dateISO !== dateCourante) {
      dateCourante = dateISO; categorieCourante = null;
      const dateLisible = dateISO ? formaterDateLisible(dateISO) : t.date || 'Date inconnue';
      html += `<div class="separateur-date">📅 ${dateLisible}</div>`;
    }
    if (t.categorie !== categorieCourante) {
      categorieCourante = t.categorie;
      html += `<div class="separateur-cat">${ICONES[t.categorie]||'📦'} ${t.categorie}</div>`;
    }
    html += `<div class="transaction-item"><div class="transaction-icone" style="background:${couleur}22;">${icone}</div><div class="transaction-info"><div class="desc">${t.description}</div><div class="cat-date">${t.date||''}</div></div><div class="transaction-montant ${classe}">${signe}${formaterMontant(t.montant)}</div><button class="btn-suppr" onclick="supprimerTransaction(${t.id})">×</button></div>`;
  });
  liste.innerHTML = html;
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(err => console.log('SW:', err));
  });
}

afficher();
