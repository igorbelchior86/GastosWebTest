document.addEventListener("DOMContentLoaded", () => {
  const methodSelect = document.getElementById("method");
  const opDate = document.getElementById("opDate");
  const cardModal = document.getElementById("cardModal");
  const closeCardModal = document.getElementById("closeCardModal");
  const toggleCards = document.getElementById("toggleCards");
  const cardList = document.getElementById("cardList");
  const btnAddCard = document.getElementById("addCardBtn");

  const cards = {};

  if (methodSelect) {
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

  const tbody = document.querySelector('#dailyTable tbody');
  if (tbody && tbody.children.length === 0) {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const ano = new Date().getFullYear();
    for (let m = 0; m < 12; m++) {
      const hdr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.textContent = meses[m];
      hdr.appendChild(td);
      tbody.appendChild(hdr);
      for (let d = 1; d <= 31; d++) {
        const data = new Date(ano, m, d);
        if (data.getMonth() !== m) break;
        const linha = document.createElement('tr');
        linha.innerHTML = `
          <td>${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}</td>
          <td></td><td></td><td></td>`;
        tbody.appendChild(linha);
      }
    }
  }
});