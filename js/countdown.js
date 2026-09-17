// Data e hora do casamento. Ajuste o horário se necessário (fuso de Brasília, -03:00).
const WEDDING_DATE = new Date("2026-12-11T16:00:00-03:00").getTime();

function updateCountdown() {
  const now = new Date().getTime();
  const diff = WEDDING_DATE - now;

  const dias = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  const horas = Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
  const min = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));
  const seg = Math.max(0, Math.floor((diff % (1000 * 60)) / 1000));

  document.getElementById("cd-dias").textContent = String(dias).padStart(2, "0");
  document.getElementById("cd-horas").textContent = String(horas).padStart(2, "0");
  document.getElementById("cd-min").textContent = String(min).padStart(2, "0");
  document.getElementById("cd-seg").textContent = String(seg).padStart(2, "0");
}

updateCountdown();
setInterval(updateCountdown, 1000);
