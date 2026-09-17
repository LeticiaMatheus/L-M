const CATEGORIA_ORDEM = ["Cozinha", "Quarto", "Banheiro", "Casa e lavanderia", "Sala", "Para o casal"];

const loading = document.getElementById("loading");
const listaCard = document.getElementById("lista-presentes-card");
const msgErro = document.getElementById("msg-erro");

const modalOverlay = document.getElementById("modal-overlay");
const modalTitulo = document.getElementById("modal-titulo");
const modalNome = document.getElementById("modal-nome");
const modalEmail = document.getElementById("modal-email");
const modalErro = document.getElementById("modal-erro");
const modalConfirmar = document.getElementById("modal-confirmar");
const modalCancelar = document.getElementById("modal-cancelar");

const modalSucesso = document.getElementById("modal-sucesso");
const sucessoItem = document.getElementById("sucesso-item");
const sucessoFechar = document.getElementById("sucesso-fechar");
const sucessoOk = document.getElementById("sucesso-ok");

let presenteEmEscolha = null;

async function carregarPresentes() {
  loading.classList.remove("oculto");
  msgErro.classList.add("oculto");

  try {
    const resp = await fetch(API_URL + "?action=presentes");
    const lista = await resp.json();
    renderizarLista(lista);
    listaCard.classList.remove("oculto");
  } catch (err) {
    msgErro.classList.remove("oculto");
  } finally {
    loading.classList.add("oculto");
  }
}

function renderizarLista(lista) {
  // agrupa por categoria, respeitando a ordem conhecida (categorias não
  // previstas aparecem no final, na ordem em que surgirem nos dados)
  const grupos = {};
  lista.forEach((p) => {
    const cat = p.categoria || "Outros";
    if (!grupos[cat]) grupos[cat] = [];
    grupos[cat].push(p);
  });

  const ordem = CATEGORIA_ORDEM.filter((c) => grupos[c]).concat(
    Object.keys(grupos).filter((c) => !CATEGORIA_ORDEM.includes(c))
  );

  listaCard.innerHTML = "";

  ordem.forEach((categoria) => {
    const bloco = document.createElement("div");
    bloco.className = "categoria-presentes";

    const titulo = document.createElement("h3");
    titulo.textContent = categoria;
    bloco.appendChild(titulo);

    const ul = document.createElement("ul");
    ul.className = "lista-itens";

    grupos[categoria].forEach((presente) => {
      const li = document.createElement("li");
      const reservado = presente.status === "Reservado";
      li.className = reservado ? "indisponivel" : "disponivel";

      if (reservado) {
        li.innerHTML = `
          <span class="nome-item"><span class="marca-x">✕</span> ${escapeHtml(presente.item)}</span>
          <span class="tag-indisponivel">indisponível</span>
        `;
      } else {
        li.innerHTML = `<span class="nome-item">${escapeHtml(presente.item)}</span>`;
        const btn = document.createElement("button");
        btn.className = "btn-escolher";
        btn.textContent = "Escolher";
        btn.addEventListener("click", () => abrirModal(presente));
        li.appendChild(btn);
      }

      ul.appendChild(li);
    });

    bloco.appendChild(ul);
    listaCard.appendChild(bloco);
  });
}

function abrirModal(presente) {
  presenteEmEscolha = presente;
  modalTitulo.textContent = presente.item;
  modalNome.value = localStorage.getItem("convite_nome") || "";
  modalEmail.value = localStorage.getItem("convite_email") || "";
  modalErro.classList.add("oculto");
  modalOverlay.classList.remove("oculto");
  modalConfirmar.disabled = false;
  modalConfirmar.textContent = "Confirmar";
}

function fecharModal() {
  modalOverlay.classList.add("oculto");
  presenteEmEscolha = null;
}

function abrirModalSucesso(item) {
  sucessoItem.textContent = item ? `Você escolheu “${item}”.` : "Seu presente foi reservado com sucesso.";
  modalSucesso.classList.remove("oculto");
  modalSucesso.setAttribute("aria-hidden", "false");
}

function fecharModalSucesso() {
  modalSucesso.classList.add("oculto");
  modalSucesso.setAttribute("aria-hidden", "true");
}

sucessoFechar.addEventListener("click", fecharModalSucesso);
sucessoOk.addEventListener("click", fecharModalSucesso);
modalSucesso.addEventListener("click", (e) => {
  if (e.target === modalSucesso) fecharModalSucesso();
});

modalCancelar.addEventListener("click", fecharModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) fecharModal();
});

modalConfirmar.addEventListener("click", async () => {
  const nome = modalNome.value.trim();
  const email = modalEmail.value.trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!nome || !emailOk) {
    modalErro.textContent = "Preencha nome e um e-mail válido.";
    modalErro.classList.remove("oculto");
    return;
  }

  modalConfirmar.disabled = true;
  modalConfirmar.textContent = "Marcando...";
  modalErro.classList.add("oculto");

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "reservar", id: presenteEmEscolha.id, nome, email }),
    });
    const data = await resp.json();

    if (data.ok) {
      const itemReservado = presenteEmEscolha ? presenteEmEscolha.item : "";
      localStorage.setItem("convite_nome", nome);
      localStorage.setItem("convite_email", email);
      fecharModal();
      abrirModalSucesso(itemReservado);
      await carregarPresentes();
    } else if (data.motivo === "ja_reservado") {
      modalErro.textContent = "Ops, alguém acabou de marcar esse item. Vamos atualizar a lista.";
      modalErro.classList.remove("oculto");
      await carregarPresentes();
      fecharModal();
    } else {
      modalErro.textContent = "Não foi possível marcar agora. Tente novamente.";
      modalErro.classList.remove("oculto");
      modalConfirmar.disabled = false;
      modalConfirmar.textContent = "Confirmar";
    }
  } catch (err) {
    modalErro.textContent = "Não foi possível marcar agora. Tente novamente.";
    modalErro.classList.remove("oculto");
    modalConfirmar.disabled = false;
    modalConfirmar.textContent = "Confirmar";
  }
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

carregarPresentes();
