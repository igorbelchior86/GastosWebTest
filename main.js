import { initializeApp } from "https://www.gstatic.com/firebasejs/10.3.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.3.1/firebase-auth.js";

import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.3.1/firebase-database.js";

// Flag for mocking data while working on UI.  
// Switch to `false` to reconnect to production Firebase.
const USE_MOCK = true;
let save, load;

if (!USE_MOCK) {
const firebaseConfig={apiKey:"AIzaSyATGZtBlnSPnFtVgTqJ_E0xmBgzLTmMkI0",authDomain:"gastosweb-e7356.firebaseapp.com",databaseURL:"https://gastosweb-e7356-default-rtdb.firebaseio.com",projectId:"gastosweb-e7356",storageBucket:"gastosweb-e7356.firebasestorage.app",messagingSenderId:"519966772782",appId:"1:519966772782:web:9ec19e944e23dbe9e899bf"};
const app=initializeApp(firebaseConfig);const db=getDatabase(app);const PATH='orcamento365_9b8e04c5';
const auth = getAuth(app);
await signInAnonymously(auth);   // garante auth.uid antes dos gets/sets
save=(k,v)=>set(ref(db,`${PATH}/${k}`),v);load=async(k,d)=>{const s=await get(ref(db,`${PATH}/${k}`));return s.exists()?s.val():d;};
}
else {
  const PATH = 'mock_365'; // isolated namespace in localStorage
  save = (k, v) => localStorage.setItem(`${PATH}_${k}`, JSON.stringify(v));
  load = async (k, d) =>
    JSON.parse(localStorage.getItem(`${PATH}_${k}`)) ?? d;
}

let transactions=[],cards=[],startBalance=null;
const $=id=>document.getElementById(id);
const tbody=document.querySelector('#dailyTable tbody');

const currency=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const meses=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const mobile=()=>window.innerWidth<=480;
const fmt=d=>d.toLocaleDateString('pt-BR',mobile()?{day:'2-digit',month:'2-digit'}:{day:'2-digit',month:'2-digit',year:'numeric'});

// Retorna YYYY-MM-DD no fuso local (corrige o shift do toISOString em UTC)
const todayISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const post=(iso,m)=>{if(m==='Dinheiro')return iso;const c=cards.find(x=>x.name===m);if(!c)return iso;const [y,mo,d]=iso.split('-').map(Number);let mm=mo,yy=y;if(d>c.close){mm++;if(mm===13){mm=1;yy++;}}return yy+'-'+String(mm).padStart(2,'0')+'-'+String(c.due).padStart(2,'0');};

const desc=$('desc'),val=$('value'),met=$('method'),date=$('opDate'),addBtn=$('addBtn');
const cardName=$('cardName'),cardClose=$('cardClose'),cardDue=$('cardDue'),addCardBtn=$('addCardBtn'),cardList=$('cardList');
const startGroup=$('startGroup'),startInput=$('startInput'),setStartBtn=$('setStartBtn'),resetBtn=$('resetData');
const startContainer = document.querySelector('.start-container');
const dividerSaldo = document.getElementById('dividerSaldo');

const showToast = msg => {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
};

const togglePlanned = id => {
  const t = transactions.find(x => x.id === id);
  if (!t) return;
  t.planned = !t.planned;
  save('tx', transactions);
  renderTable();
};

const openCardBtn=document.getElementById('openCardModal');
const cardModal=document.getElementById('cardModal');
const closeCardModal=document.getElementById('closeCardModal');

function refreshMethods(){met.innerHTML='';cards.forEach(c=>{const o=document.createElement('option');o.value=c.name;o.textContent=c.name;met.appendChild(o);});}
function renderCardList() {
  cardList.innerHTML = '';
  cards.filter(c => c.name !== 'Dinheiro').forEach(c => {
    const li = document.createElement('li');
    li.innerHTML = `<div class="card-line">
      <div>
        <div class="card-name">${c.name}</div>
        <div class="card-dates">Fechamento: ${c.close} | Vencimento: ${c.due}</div>
      </div>
    </div>`;
    const del = document.createElement('button');
    del.className = 'icon danger';
    del.textContent = '🗑';
    del.onclick = () => {
      if (confirm('Excluir cartão?')) {
        cards = cards.filter(x => x.name !== c.name);
        save('cards', cards);
        refreshMethods();
        renderCardList();
        renderTable();
      }
    };
    li.querySelector('.card-line').appendChild(del);
    cardList.appendChild(li);
  });
}
const makeLine = t => {
  const d = document.createElement('div');
  d.className = 'op-line';

  const topRow = document.createElement('div');
  topRow.className = 'op-main';

  const left = document.createElement('div');
  left.className = 'op-left';
  if (t.planned) {
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.className = 'plan-check';
    chk.onchange = () => togglePlanned(t.id);
    left.appendChild(chk);
  }
  const descNode = document.createElement('span');
  descNode.textContent = t.desc;
  left.appendChild(descNode);

  const right = document.createElement('div');
  right.className = 'op-right';

  const editBtn = document.createElement('button');
  editBtn.className = 'icon';
  editBtn.textContent = '✏️';
  editBtn.onclick = () => editTx(t.id);

  right.appendChild(editBtn);

  const delBtn = document.createElement('button');
  delBtn.className = 'icon danger';
  delBtn.textContent = '🗑';
  delBtn.onclick = () => delTx(t.id);

  const value = document.createElement('span');
  value.className = 'value';
  value.textContent = `R$ ${(t.val < 0 ? '-' : '')}${Math.abs(t.val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  right.appendChild(delBtn);
  right.appendChild(value);

  topRow.appendChild(left);
  topRow.appendChild(right);
  d.appendChild(topRow);

  // Only show timestamp for planned transactions
  if (t.planned) {
    const ts = document.createElement('div');
    ts.className = 'timestamp';
    const timeStr = new Date(t.ts).toLocaleTimeString('pt-BR', { hour12: false });
    const methodLabel = t.method === 'Dinheiro'
      ? 'Dinheiro'
      : `Cartão ${t.method}`;
    ts.textContent = `${timeStr} - ${methodLabel}`;
    d.appendChild(ts);
  }

  return d;
};

function addCard(){const n=cardName.value.trim(),cl=+cardClose.value,du=+cardDue.value;if(!n||cl<1||cl>31||du<1||du>31||cl>=du||cards.some(c=>c.name===n)){alert('Dados inválidos');return;}cards.push({name:n,close:cl,due:du});save('cards',cards);refreshMethods();renderCardList();cardName.value='';cardClose.value='';cardDue.value='';}

function addTx() {
  if (startBalance === null) {
    showToast('Defina o saldo inicial primeiro (pode ser 0).');
    return;
  }
  const d = desc.value.trim(),
        v = parseFloat(val.value),
        m = met.value,
        iso = date.value;
  if (!d || isNaN(v) || !iso) {
    alert('Complete os campos');
    return;
  }
  transactions.push({
    id: Date.now(),
    desc: d,
    val: v,
    method: m,
    opDate: iso,
    postDate: post(iso, m),
    planned: iso > todayISO(),
    ts: new Date().toISOString()
  });
  save('tx', transactions);
  desc.value = '';
  val.value = '';
  date.value = todayISO();
  renderTable();
}

const delTx=id=>{if(!confirm('Apagar?'))return;transactions=transactions.filter(t=>t.id!==id);save('tx',transactions);renderTable();};
const editTx=id=>{const t=transactions.find(x=>x.id===id);if(!t)return;const nd=prompt('Descrição',t.desc);if(nd===null)return;const nv=parseFloat(prompt('Valor',t.val));if(isNaN(nv))return;t.desc=nd.trim();t.val=nv;save('tx',transactions);renderTable();};

function renderTable(){
  tbody.innerHTML='';
  const y=new Date().getFullYear();const cur=new Date().getMonth();let saldo=startBalance||0;
  for(let m=0;m<12;m++){
    const hdr=document.createElement('tr');hdr.className='month-header';hdr.dataset.m=m;if(m<cur)hdr.classList.add('closed');
    const td=document.createElement('td');td.colSpan=4;td.textContent=meses[m];hdr.appendChild(td);
    hdr.onclick=()=>{const hide=hdr.classList.toggle('closed');document.querySelectorAll(`tr[data-mon='${m}']`).forEach(r=>r.style.display=hide?'none':'table-row');};
    tbody.appendChild(hdr);
    for(let d=1;d<=31;d++){
      const date=new Date(y,m,d);if(date.getMonth()!==m)break;
      const iso=date.toISOString().slice(0,10);const dayTx=transactions.filter(t=>t.postDate===iso);const sum=dayTx.reduce((s,t)=>s+t.val,0);saldo+=sum;
      const row=document.createElement('tr');row.dataset.mon=m;row.style.display=m<cur?'none':'table-row';
      row.innerHTML=`<td>${fmt(date)}</td><td></td><td></td><td${saldo<0?' class="saldo-neg"':''}>${currency(saldo)}</td>`;
      const tdD=row.children[1],tdG=row.children[2];
      if(sum!==0){tdG.textContent=currency(sum);tdG.className=sum<0?'negative':'positive';}
      dayTx.filter(t=>t.method==='Dinheiro').forEach(t=>tdD.appendChild(makeLine(t)));
      const grp={};dayTx.filter(t=>t.method!=='Dinheiro').forEach(t=>(grp[t.method]=grp[t.method]||[]).push(t));
      Object.keys(grp).forEach(card=>{const det=document.createElement('details');det.className='invoice';const sm=document.createElement('summary');sm.textContent='Fatura '+card;det.appendChild(sm);grp[card].forEach(t=>{det.appendChild(makeLine(t));const ts=document.createElement('div');ts.className='op-ts';ts.textContent=t.ts.slice(5,16).replace('T',' ');det.appendChild(ts);});tdD.appendChild(det);});
      tbody.appendChild(row);
    }
  }
  // constrói o acordeão de 3 níveis
  renderAccordion();
}

// -----------------------------------------------------------------------------
// Acordeão: mês → dia → fatura
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// Accordion: month ▶ day ▶ invoice
// Shows every month (Jan–Dec) and every day (01–31),
// past months collapsed by default, current & future months open.
// -----------------------------------------------------------------------------
function renderAccordion() {
  const acc = document.getElementById('accordion');
  if (!acc) return;
  // Salva quais <details> estão abertos antes de recriar
  const openKeys = Array.from(acc.querySelectorAll('details[open]'))
                        .map(d => d.dataset.key || '');
  acc.innerHTML = '';

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const currency = v => v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const curMonth = new Date().getMonth();   // 0‑based

  // Helper to get all transactions of a specific ISO date
  const txByDate = iso => transactions.filter(t => t.postDate === iso);

  let runningBalance = startBalance || 0;          // saldo acumulado
  for (let mIdx = 0; mIdx < 12; mIdx++) {
    const nomeMes = new Date(2025, mIdx).toLocaleDateString('pt-BR', { month: 'long' });
    // Build month container
    const mDet = document.createElement('details');
    mDet.className = 'month';
    mDet.dataset.key = `m-${mIdx}`;   // identifica o mês
    const isOpen = mIdx >= curMonth;
    mDet.open = openKeys.includes(mDet.dataset.key) || isOpen;
    // Month total = sum of all tx in that month
    const monthTotal = transactions
      .filter(t => new Date(t.postDate).getMonth() === mIdx)
      .reduce((s,t) => s + t.val, 0);
    // Cria summary estilizado como linha do mês
    const mSum = document.createElement('summary');
    mSum.className = 'month-divider';
    mSum.innerHTML = `${nomeMes.toUpperCase()} <hr>`;
    mDet.appendChild(mSum);

    // Garante o número correto de dias em cada mês
    const daysInMonth = new Date(2025, mIdx + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(2025, mIdx, d);
      const iso = dateObj.toISOString().slice(0, 10);
      const dayTx = txByDate(iso);

      const dayTotal = dayTx.reduce((s,t)=>s + t.val,0);
      runningBalance += dayTotal;                           // atualiza saldo acumulado
      const dow = dateObj.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' });
      const dDet = document.createElement('details');
      dDet.className = 'day';
      dDet.dataset.key = `d-${iso}`;    // identifica o dia YYYY‑MM‑DD
      dDet.open = openKeys.includes(dDet.dataset.key);
      const today = new Date().toISOString().slice(0, 10);
      if (iso === today) dDet.classList.add('today');
      const dSum = document.createElement('summary');
      dSum.className = 'day-summary';
      const saldoFormatado = runningBalance < 0
        ? `R$ -${Math.abs(runningBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : `R$ ${runningBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      const baseLabel = `${String(d).padStart(2,'0')} - ${dow.charAt(0).toUpperCase() + dow.slice(1)}`;
      const hasCardDue = cards.some(card => card.due === d);
      const labelWithDue = hasCardDue ? `${baseLabel} | 💳` : baseLabel;
      dSum.innerHTML = `<span>${labelWithDue}</span><span class="day-balance" style="margin-left:auto">${saldoFormatado}</span>`;
      if (runningBalance < 0) dDet.classList.add('negative');
      dDet.appendChild(dSum);

      // Group card operations by method (case-insensitive for 'Dinheiro')
      const cashOps = dayTx.filter(t => t.method.toLowerCase() === 'dinheiro');
      const cardGroups = {};
      dayTx.filter(t => t.method.toLowerCase() !== 'dinheiro')
           .forEach(t => (cardGroups[t.method] = cardGroups[t.method] || []).push(t));

      // Seção de planejados
      const plannedSection = document.createElement('div');
      plannedSection.className = 'planned-section';
      const plannedHeader = document.createElement('div');
      plannedHeader.className = 'planned-header';
      plannedHeader.textContent = 'Planejados:';
      plannedSection.appendChild(plannedHeader);
      const plannedList = document.createElement('ul');
      plannedList.className = 'planned-list';
      plannedSection.appendChild(plannedList);
      dDet.appendChild(plannedSection);

      // Planejados em dinheiro e cartão
      dayTx.filter(t => t.planned).forEach(t => {
        const li = document.createElement('li');
        li.appendChild(makeLine(t));
        plannedList.appendChild(li);
      });

      // Fatura (executados no cartão)
      Object.entries(cardGroups).forEach(([card, list]) => {
        const invDet = document.createElement('details');
        invDet.className = 'invoice';
        const invSum = document.createElement('summary');
        const invTotal = list.reduce((s,t)=>s + t.val,0);
        invSum.textContent = `Fatura - ${card}  ${currency(invTotal)}`;
        invDet.appendChild(invSum);
        const invExec    = list.filter(t => !t.planned);
        if (invExec.length) {
          const execList = document.createElement('ul');
          execList.className = 'executed-list';
          invExec.forEach(t => {
            const li = document.createElement('li');
            li.appendChild(makeLine(t));
            execList.appendChild(li);
          });
          invDet.appendChild(execList);
        }
        dDet.appendChild(invDet);
      });

      // Seção de executados em dinheiro
      const executedCash = document.createElement('div');
      executedCash.className = 'executed-cash';
      const execHeader = document.createElement('div');
      execHeader.className = 'executed-header';
      execHeader.textContent = 'Executados (Dinheiro):';
      executedCash.appendChild(execHeader);
      const execList = document.createElement('ul');
      execList.className = 'executed-list';
      const cashExec = cashOps.filter(t => !t.planned);
      cashExec.forEach(t => {
        const li = document.createElement('li');
        li.appendChild(makeLine(t));
        execList.appendChild(li);
      });
      executedCash.appendChild(execList);
      dDet.appendChild(executedCash);

      mDet.appendChild(dDet);
    }
    // Adiciona summary do mês normalmente
    mDet.appendChild(mSum);
    acc.appendChild(mDet);

    // Cria linha meta como elemento independente
    const metaLine = document.createElement('div');
    metaLine.className = 'month-meta';

    let label;
    if (mIdx < curMonth) label = 'Saldo final:';
    else if (mIdx === curMonth) label = 'Saldo atual:';
    else label = 'Saldo projetado:';

    metaLine.innerHTML = `<span>| ${label}</span><strong>${currency(runningBalance)}</strong>`;

    // Se o mês estiver fechado (collapsed), exibe metaLine abaixo de mDet
    if (!mDet.open) {
      acc.appendChild(metaLine);
    }

    // Atualiza visibilidade ao expandir/fechar
    mDet.addEventListener('toggle', () => {
      if (mDet.open) {
        if (metaLine.parentElement === acc) {
          acc.removeChild(metaLine);
        }
      } else {
        acc.insertBefore(metaLine, mDet.nextSibling);
      }
    });
  }
}

function initStart() {
  const showStart = startBalance === null && transactions.length === 0;
  // exibe ou oculta todo o container de saldo inicial
  startContainer.style.display = showStart ? 'block' : 'none';
  dividerSaldo.style.display = showStart ? 'block' : 'none';
  // (mantém linha antiga para compatibilidade)
  startGroup.style.display = showStart ? 'flex' : 'none';
  // mantém o botão habilitado; a função addTx impede lançamentos
  addBtn.classList.toggle('disabled', showStart);
}
setStartBtn.onclick=()=>{const v=parseFloat(startInput.value);if(isNaN(v)){alert('Valor inválido');return;}startBalance=v;save('startBal',v);initStart();renderTable();};
resetBtn.onclick=()=>{if(!confirm('Resetar tudo?'))return;transactions=[];cards=[{name:'Dinheiro',close:0,due:0}];startBalance=null;save('tx',transactions);save('cards',cards);save('startBal',null);refreshMethods();renderCardList();initStart();renderTable();};
addCardBtn.onclick=addCard;addBtn.onclick=addTx;
openCardBtn.onclick = () => cardModal.classList.remove('hidden');
closeCardModal.onclick = () => cardModal.classList.add('hidden');
cardModal.onclick = e => { if (e.target === cardModal) cardModal.classList.add('hidden'); };

(async()=>{transactions=await load('tx',[]);cards=await load('cards',[{name:'Dinheiro',close:0,due:0}]);if(!cards.some(c=>c.name==='Dinheiro'))cards.unshift({name:'Dinheiro',close:0,due:0});startBalance=await load('startBal',null);refreshMethods();renderCardList();initStart();date.value=todayISO();renderTable();})();