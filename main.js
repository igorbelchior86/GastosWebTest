document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("toggleCards");
  const panel = document.getElementById("cardPanel");

  if (toggle && panel) {
    toggle.addEventListener("click", () => {
      panel.classList.toggle("active");
    });
  }

  // Adiciona a opção padrão "Dinheiro"
  const method = document.getElementById("method");
  if (method && !method.querySelector('option[value="dinheiro"]')) {
    const opt = document.createElement("option");
    opt.value = "dinheiro";
    opt.textContent = "Dinheiro";
    method.appendChild(opt);
  }

  // Define a data atual no input[type="date"]
  const opDate = document.getElementById("opDate");
  if (opDate) {
    const hoje = new Date();
    const yyyy = hoje.getFullYear();
    const mm = String(hoje.getMonth() + 1).padStart(2, '0');
    const dd = String(hoje.getDate()).padStart(2, '0');
    opDate.value = `${yyyy}-${mm}-${dd}`;
  }

  // Gera a tabela estática de dias caso não exista
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
