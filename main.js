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
const post=(iso,m)=>{if(m==='Dinheiro')return iso;const c=cards.find(x=>x.name===m);if(!c)return iso;const [y,mo,d]=iso.split('-').map(Number);let mm=mo,yy=y;if(d>c.close){mm++;if(mm===13){mm=1;yy++;}}return yy+'-'+String(mm).padStart(2,'0')+'-'+String(c.due).padStart(2,'0');};

const desc=$('desc'),val=$('value'),met=$('method'),date=$('opDate'),addBtn=$('addBtn');
const cardName=$('cardName'),cardClose=$('cardClose'),cardDue=$('cardDue'),addCardBtn=$('addCardBtn'),cardList=$('cardList');
const startGroup=$('startGroup'),startInput=$('startInput'),setStartBtn=$('setStartBtn'),resetBtn=$('resetData');
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
const makeLine=t=>{const d=document.createElement('div');d.className='op-line';const txt=document.createElement('div');txt.className='op-txt';txt.innerHTML=`<span>${t.desc}</span><span class="value">${currency(t.val)}</span>`;d.appendChild(txt);const e=document.createElement('button');e.className='icon';e.textContent='✏️';e.onclick=()=>editTx(t.id);const del=document.createElement('button');del.className='icon danger';del.textContent='🗑';del.onclick=()=>delTx(t.id);d.appendChild(e);d.appendChild(del);return d;};

function addCard(){const n=cardName.value.trim(),cl=+cardClose.value,du=+cardDue.value;if(!n||cl<1||cl>31||du<1||du>31||cl>=du||cards.some(c=>c.name===n)){alert('Dados inválidos');return;}cards.push({name:n,close:cl,due:du});save('cards',cards);refreshMethods();renderCardList();cardName.value='';cardClose.value='';cardDue.value='';}
function addTx(){const d=desc.value.trim(),v=parseFloat(val.value),m=met.value,iso=date.value;if(!d||isNaN(v)||!iso){alert('Complete os campos');return;}transactions.push({id:Date.now(),desc:d,val:v,method:m,opDate:iso,postDate:post(iso,m),ts:new Date().toISOString()});save('tx',transactions);desc.value='';val.value='';date.value=new Date().toISOString().slice(0,10);renderTable();}
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
  acc.innerHTML = '';

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const currency = v => v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const curMonth = new Date().getMonth();   // 0‑based

  // Helper to get all transactions of a specific ISO date
  const txByDate = iso => transactions.filter(t => t.postDate === iso);

  let runningBalance = startBalance || 0;          // saldo acumulado
  for (let mIdx = 0; mIdx < 12; mIdx++) {
    // Build month container
    const mDet = document.createElement('details');
    mDet.className = 'month';
    const isOpen = mIdx >= curMonth;
    mDet.open = isOpen;
    // Month total = sum of all tx in that month
    const monthTotal = transactions
      .filter(t => new Date(t.postDate).getMonth() === mIdx)
      .reduce((s,t) => s + t.val, 0);
    const mSum = document.createElement('summary');
    // New: separate arrow and label spans
    const spanIcon = document.createElement('span');
    spanIcon.className = 'month-arrow';
    spanIcon.textContent = '▶️';

    const spanText = document.createElement('span');
    spanText.className = 'month-label';
    const nomeMes = new Date(2025, mIdx).toLocaleDateString('pt-BR', { month: 'long' });
    spanText.textContent = `${nomeMes.charAt(0).toUpperCase()}${nomeMes.slice(1)}`;

    mSum.appendChild(spanText);
    mSum.insertBefore(spanIcon, spanText);

    // Não troca o emoji, apenas anima via CSS
    mDet.appendChild(mSum);

    // Iterate through all possible days (1‑31)
    for (let d = 1; d <= 31; d++) {
      const iso = `2025-${String(mIdx + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayTx = txByDate(iso);
      // Skip invalid day numbers (e.g., 31/04)
      if (new Date(iso).getMonth() !== mIdx) continue;

      const dayTotal = dayTx.reduce((s,t)=>s + t.val,0);
      runningBalance += dayTotal;                           // atualiza saldo acumulado
      const dow = new Date(iso).toLocaleDateString('pt-BR',{weekday:'long'});
      const dDet = document.createElement('details');
      dDet.className = 'day';
      const dSum = document.createElement('summary');
      dSum.className = 'day-summary';
      const saldoFormatado = runningBalance < 0
        ? `R$ -${Math.abs(runningBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : `R$ ${runningBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      dSum.innerHTML = `<span>${String(d).padStart(2,'0')} - ${dow.charAt(0).toUpperCase() + dow.slice(1)}</span><span style="margin-left:auto">${saldoFormatado}</span>`;
      dDet.appendChild(dSum);

      // Group card operations by method
      const cashOps = dayTx.filter(t => t.method === 'Dinheiro');
      const cardGroups = {};
      dayTx.filter(t => t.method !== 'Dinheiro')
           .forEach(t => (cardGroups[t.method] = cardGroups[t.method] || []).push(t));

      // Build invoices
      Object.entries(cardGroups).forEach(([card, list]) => {
        const invDet = document.createElement('details');
        invDet.className = 'invoice';
        const invSum = document.createElement('summary');
        const invTotal = list.reduce((s,t)=>s + t.val,0);
        invSum.textContent = `Fatura - ${card}  ${currency(invTotal)}`;
        invDet.appendChild(invSum);
        list.forEach(t => invDet.appendChild(makeLine(t)));
        dDet.appendChild(invDet);
      });

      // Cash operations
      cashOps.forEach(t => dDet.appendChild(makeLine(t)));

      mDet.appendChild(dDet);
    }

    acc.appendChild(mDet);
  }
}

function initStart(){startGroup.style.display=startBalance===null?'flex':'none';}
setStartBtn.onclick=()=>{const v=parseFloat(startInput.value);if(isNaN(v)){alert('Valor inválido');return;}startBalance=v;save('startBal',v);initStart();renderTable();};
resetBtn.onclick=()=>{if(!confirm('Resetar tudo?'))return;transactions=[];cards=[{name:'Dinheiro',close:0,due:0}];startBalance=null;save('tx',transactions);save('cards',cards);save('startBal',null);refreshMethods();renderCardList();initStart();renderTable();};
addCardBtn.onclick=addCard;addBtn.onclick=addTx;
openCardBtn.onclick = () => cardModal.classList.remove('hidden');
closeCardModal.onclick = () => cardModal.classList.add('hidden');
cardModal.onclick = e => { if (e.target === cardModal) cardModal.classList.add('hidden'); };

(async()=>{transactions=await load('tx',[]);cards=await load('cards',[{name:'Dinheiro',close:0,due:0}]);if(!cards.some(c=>c.name==='Dinheiro'))cards.unshift({name:'Dinheiro',close:0,due:0});startBalance=await load('startBal',null);refreshMethods();renderCardList();initStart();date.value=new Date().toISOString().slice(0,10);renderTable();})();