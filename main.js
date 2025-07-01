document.addEventListener("DOMContentLoaded", () => {
  // Método de pagamento
  const method = document.getElementById("method");
  if (method) {
    method.innerHTML = ''; // limpar
    const opt = document.createElement("option");
    opt.value = "dinheiro";
    opt.textContent = "Dinheiro";
    method.appendChild(opt);
  }

  // Data atual
  const opDate = document.getElementById("opDate");
  if (opDate) {
    const hoje = new Date();
    const yyyy = hoje.getFullYear();
    const mm = String(hoje.getMonth() + 1).padStart(2, '0');
    const dd = String(hoje.getDate()).padStart(2, '0');
    opDate.value = `${yyyy}-${mm}-${dd}`;
  }

  // Toggle do painel de cartões
  const toggle = document.getElementById("toggleCards");
  const panel = document.getElementById("cardPanel");
  if (toggle && panel) {
    toggle.addEventListener("click", () => {
      panel.classList.toggle("active");
    });
  }

  // Gerar tabela estática se vazia
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

  // Adicionar cartão à lista visual
  const cardList = document.getElementById("cardList");
  const btnAddCard = document.getElementById("addCardBtn");
  if (btnAddCard && cardList) {
    btnAddCard.addEventListener("click", () => {
      const name = document.getElementById("cardName").value.trim();
      const close = document.getElementById("cardClose").value.trim();
      const due = document.getElementById("cardDue").value.trim();
      if (!name || !close || !due) return alert("Preencha todos os campos do cartão.");
      const li = document.createElement("li");
      li.innerHTML = `💳 <strong>${name}</strong> - Fechamento: ${close} | Vencimento: ${due} <button class="icon">✏️</button> <button class="icon danger">🗑️</button>`;
      cardList.appendChild(li);
      document.getElementById("cardName").value = '';
      document.getElementById("cardClose").value = '';
      document.getElementById("cardDue").value = '';
    });
  }
