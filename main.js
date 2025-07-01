document.addEventListener("DOMContentLoaded", () => {
  const methodSelect = document.getElementById("method");
  const opDate = document.getElementById("opDate");
  const cardModal = document.getElementById("cardModal");
  const closeCardModal = document.getElementById("closeCardModal");
  const toggleCards = document.getElementById("toggleCards");
  const cardList = document.getElementById("cardList");
  const btnAddCard = document.getElementById("addCardBtn");

  const cards = {};

  if (methodSelect && !methodSelect.querySelector('option[value="dinheiro"]')) {
    const dinheiro = document.createElement("option");
    dinheiro.value = "dinheiro";
    dinheiro.textContent = "Dinheiro";
    methodSelect.appendChild(dinheiro);
  }

  if (opDate) {
    const hoje = new Date();
    const yyyy = hoje.getFullYear();
    const mm = String(hoje.getMonth() + 1).padStart(2, '0');
    const dd = String(hoje.getDate()).padStart(2, '0');
    opDate.value = `${yyyy}-${mm}-${dd}`;
  }

  toggleCards.addEventListener("click", () => {
    cardModal.classList.remove("hidden");
  });

  closeCardModal.addEventListener("click", () => {
    cardModal.classList.add("hidden");
  });

  function renderCards() {
    cardList.innerHTML = "";
    for (const key in cards) {
      const { name, close, due } = cards[key];
      const li = document.createElement("li");
      li.innerHTML = `
        <div><strong>💳 ${name}</strong></div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <small>Fechamento: ${close} | Vencimento: ${due}</small>
          <span>
            <button class="icon" data-edit="${key}">✏️</button>
            <button class="icon danger" data-delete="${key}">🗑️</button>
          </span>
        </div>
        <hr style="margin-top: 8px;">`;
      cardList.appendChild(li);

      li.querySelector('[data-delete]').onclick = () => {
        delete cards[key];
        const opt = methodSelect.querySelector(`option[value="${key}"]`);
        if (opt) opt.remove();
        renderCards();
      };
    }
  }

  btnAddCard.addEventListener("click", () => {
    const name = document.getElementById("cardName").value.trim();
    const close = parseInt(document.getElementById("cardClose").value.trim(), 10);
    const due = parseInt(document.getElementById("cardDue").value.trim(), 10);

    if (!name || isNaN(close) || isNaN(due)) return alert("Preencha todos os campos.");
    if (close < 1 || close > 31 || due < 1 || due > 31) return alert("Fechamento e vencimento devem ser entre 1 e 31.");

    const key = name.toLowerCase().replace(/\s+/g, '-');

    if (cards[key]) return alert("Esse cartão já existe.");

    cards[key] = { name, close, due };

    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = name;
    methodSelect.appendChild(opt);

    document.getElementById("cardName").value = '';
    document.getElementById("cardClose").value = '';
    document.getElementById("cardDue").value = '';

    renderCards();
  });

  // --- Removido: tbody initialization and month/day rows generation ---

  // --- Adicionado: Saldo inicial e operações dinâmicas ---
  const startInput = document.getElementById("startInput");
  const setStartBtn = document.getElementById("setStartBtn");
  const startGroup = document.getElementById("startGroup");
  const addBtn = document.getElementById("addBtn");
  const descInput = document.getElementById("desc");
  const valueInput = document.getElementById("value");

  let saldoInicial = null;
  const transacoes = [];

  function renderAccordion() {
    const acc = document.getElementById("accordion");
    acc.innerHTML = "";
    const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const hoje = new Date();
    const ano = hoje.getFullYear();
    meses.forEach((mesNome, m) => {
      const monthDetail = document.createElement("details");
      const monthSummary = document.createElement("summary");
      monthSummary.textContent = mesNome;
      monthSummary.className = "month-summary";
      monthDetail.appendChild(monthSummary);
      for (let d = 1; d <= 31; d++) {
        const dataObj = new Date(ano, m, d);
        if (dataObj.getMonth() !== m) break;
        const dayDetail = document.createElement("details");
        const daySummary = document.createElement("summary");
        const weekday = dataObj.toLocaleDateString('pt-BR', { weekday: 'long' });
        const key = `${ano}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        const daySaldo = (() => {
          const ops = transacoes.filter(t => t.date === key);
          let saldo = saldoInicial || 0;
          ops.forEach(t => saldo += t.val);
          return saldo.toFixed(2);
        })();
        daySummary.innerHTML = `<span>${String(d).padStart(2,'0')} ${weekday}</span><span>R$ ${daySaldo}</span>`;
        daySummary.className = "day-summary";
        dayDetail.appendChild(daySummary);
        const opsContainer = document.createElement("div");
        opsContainer.className = "operations";
        transacoes.filter(t => t.date === key).forEach((t, idx) => {
          const op = document.createElement("div");
          op.className = "op-item";
          op.innerHTML = `
            <span>${t.desc} <small>${new Date(t.date).toLocaleTimeString('pt-BR')}</small></span>
            <span>
              <button class="edit" data-index="${idx}">✏️</button>
              <button class="delete" data-index="${idx}">🗑️</button>
            </span>
            <span>R$ ${t.val.toFixed(2)}</span>
          `;
          opsContainer.appendChild(op);
        });
        dayDetail.appendChild(opsContainer);
        monthDetail.appendChild(dayDetail);
      }
      acc.appendChild(monthDetail);
    });
  }

  setStartBtn.onclick = () => {
    const v = parseFloat(startInput.value);
    if (!isNaN(v)) {
      saldoInicial = v;
      startGroup.style.display = "none";
      renderAccordion();
    }
  };

  addBtn.onclick = () => {
    const desc = descInput.value.trim();
    const val = parseFloat(valueInput.value.trim());
    const date = document.getElementById("opDate").value;
    if (!desc || isNaN(val) || !date) return alert("Preencha todos os campos.");
    transacoes.push({ desc, val, date });
    renderAccordion();
  };

  const resetBtn = document.getElementById("resetData");
  if (resetBtn) {
    resetBtn.onclick = () => {
      // Limpa todas as transações e reseta o saldo
      transacoes.length = 0;
      saldoInicial = null;
      // Reexibe o painel de entrada de saldo inicial
      startInput.value = '';
      startGroup.style.display = "flex";
      // Renderiza tabela limpa
      renderAccordion();
    };
  }

  // Initial render (optional)
  // renderTabela();
  renderAccordion();
});