document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("toggleCards");
  const panel = document.getElementById("cardPanel");
  if (toggle && panel) {
    toggle.addEventListener("click", () => {
      panel.classList.toggle("active");
    });
  }
});

// ... (mantenha abaixo o restante do seu JS de transações) ...
