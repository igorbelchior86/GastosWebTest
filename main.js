document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("toggleCards");
  const panel = document.getElementById("cardPanel");
  if (toggle && panel) {
    toggle.addEventListener("click", () => {
      panel.classList.toggle("active");
    });
  }
});

// ... mantenha aqui o restante do seu JS de transações (save/load, renderTable, etc.) ...
