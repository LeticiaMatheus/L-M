let ADMIN_SESSION_TOKEN = sessionStorage.getItem("admin_token") || "";

const loginOverlay = document.getElementById("admin-login-overlay");
const loginInput = document.getElementById("admin-token-input");
const loginButton = document.getElementById("admin-login-btn");
const loginError = document.getElementById("admin-login-error");
const loginToggle = document.getElementById("admin-token-toggle");
const openLoginButton = document.getElementById("abrir-admin-login");
const closeLoginButton = document.getElementById("admin-modal-close");

function mostrarErroLogin(mensagem) {
  if (!loginError) return;
  loginError.textContent = mensagem;
  loginError.classList.remove("oculto");
}

function esconderErroLogin() {
  if (loginError) loginError.classList.add("oculto");
}

function abrirTelaLogin(mensagem = "") {
  if (!loginOverlay) return;
  loginOverlay.classList.remove("oculto");
  loginOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("admin-bloqueado");
  if (mensagem) mostrarErroLogin(mensagem);
  setTimeout(() => loginInput?.focus(), 100);
}

function fecharTelaLogin() {
  if (!loginOverlay) return;
  loginOverlay.classList.add("oculto");
  loginOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("admin-bloqueado");
}

async function requisitarAdmin(token, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Mantém exatamente o mesmo endpoint usado pelo login antigo com alert/prompt.
    const url = API_URL + "?action=presentes_admin&token=" + encodeURIComponent(token);
    const resp = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal
    });

    if (!resp.ok) {
      throw new Error("HTTP " + resp.status);
    }

    return await resp.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function autenticarAdmin() {
  // Não altera o token digitado: o login antigo também enviava o valor diretamente.
  const token = loginInput?.value || "";
  esconderErroLogin();

  if (!token) {
    mostrarErroLogin("Digite o token de administrador para continuar.");
    loginInput?.focus();
    return false;
  }

  if (loginButton) {
    loginButton.disabled = true;
    loginButton.textContent = "Verificando...";
  }

  try {
    const lista = await requisitarAdmin(token);

    if (lista && lista.erro === "unauthorized") {
      mostrarErroLogin("Token incorreto. Confira e tente novamente.");
      loginInput?.focus();
      loginInput?.select();
      return false;
    }

    if (!Array.isArray(lista)) {
      mostrarErroLogin("O servidor respondeu em um formato inesperado.");
      return false;
    }

    ADMIN_SESSION_TOKEN = token;
    sessionStorage.setItem("admin_token", token);

    fecharTelaLogin();
    mostrarPresentes(lista);
    return true;
  } catch (err) {
    if (err.name === "AbortError") {
      mostrarErroLogin("A conexão demorou demais. Verifique a internet e tente novamente.");
    } else {
      mostrarErroLogin("Não foi possível conectar ao servidor. Tente novamente.");
    }
    return false;
  } finally {
    if (loginButton) {
      loginButton.disabled = false;
      loginButton.textContent = "Entrar no painel";
    }
  }
}

function mostrarPresentes(lista) {
  const loading = document.getElementById("loading-presentes");
  const tabela = document.getElementById("tabela-presentes");
  const tbody = document.getElementById("tbody-presentes");
  const msgErro = document.getElementById("msg-erro");

  if (!tbody) return;

  if (msgErro) msgErro.classList.add("oculto");
  tbody.innerHTML = "";

  lista.forEach((p) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHtml(p.item)}</td>
      <td>${escapeHtml(p.categoria)}</td>
      <td><span class="admin-status ${p.status === "Reservado" ? "reservado" : "livre"}">${escapeHtml(p.status)}</span></td>
      <td>${escapeHtml(p.reservadoPor)}</td>
      <td>${escapeHtml(p.reservadoEmail)}</td>
      <td></td>
    `;

    if (p.status === "Reservado") {
      const btn = document.createElement("button");
      btn.className = "btn-liberar";
      btn.textContent = "Liberar";
      btn.addEventListener("click", () => liberarPresente(p.id, btn));
      tr.lastElementChild.appendChild(btn);
    }

    tbody.appendChild(tr);
  });

  if (loading) loading.classList.add("oculto");
  if (tabela) tabela.style.display = "table";
}

async function carregarPresentesAdmin() {
  const loading = document.getElementById("loading-presentes");
  const tabela = document.getElementById("tabela-presentes");
  const msgErro = document.getElementById("msg-erro");

  if (loading) loading.classList.remove("oculto");
  if (tabela) tabela.style.display = "none";

  if (!ADMIN_SESSION_TOKEN) {
    if (loading) loading.classList.add("oculto");
    abrirTelaLogin();
    return;
  }

  try {
    const lista = await requisitarAdmin(ADMIN_SESSION_TOKEN);

    if (lista && lista.erro === "unauthorized") {
      sessionStorage.removeItem("admin_token");
      ADMIN_SESSION_TOKEN = "";
      if (loading) loading.classList.add("oculto");
      abrirTelaLogin("Sua sessão expirou. Digite o token novamente.");
      return;
    }

    if (!Array.isArray(lista)) throw new Error("Resposta inválida");
    mostrarPresentes(lista);
  } catch (err) {
    // Se havia token salvo e ele falhou por rede/servidor, não apagamos a sessão.
    if (msgErro) msgErro.classList.remove("oculto");
    if (loading) loading.classList.add("oculto");
  }
}

async function liberarPresente(id, btn) {
  const confirmar = confirm(
    'Liberar esse item de volta pra "Livre"? Isso apaga o nome e e-mail de quem tinha marcado.'
  );
  if (!confirmar) return;

  btn.disabled = true;
  btn.textContent = "Liberando...";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "liberar",
        id: id,
        token: ADMIN_SESSION_TOKEN
      }),
      cache: "no-store",
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!resp.ok) throw new Error("HTTP " + resp.status);

    const data = await resp.json();

    if (data.ok) {
      await openLoginButton?.addEventListener("click", abrirTelaLogin);
closeLoginButton?.addEventListener("click", fecharTelaLogin);
loginOverlay?.addEventListener("click", (event) => {
  if (event.target === loginOverlay) fecharTelaLogin();
});

carregarPresentesAdmin();
    } else if (data.motivo === "unauthorized") {
      sessionStorage.removeItem("admin_token");
      ADMIN_SESSION_TOKEN = "";
      abrirTelaLogin("Sua sessão expirou. Digite o token novamente.");
    } else {
      alert("Não foi possível liberar agora. Tente novamente.");
      btn.disabled = false;
      btn.textContent = "Liberar";
    }
  } catch (err) {
    alert("Não foi possível liberar agora. Tente novamente.");
    btn.disabled = false;
    btn.textContent = "Liberar";
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

loginButton?.addEventListener("click", autenticarAdmin);

loginInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    autenticarAdmin();
  }
});

loginToggle?.addEventListener("click", () => {
  if (!loginInput) return;

  const mostrar = loginInput.type === "password";
  loginInput.type = mostrar ? "text" : "password";
  loginToggle.setAttribute(
    "aria-label",
    mostrar ? "Ocultar token" : "Mostrar token"
  );
  loginToggle.textContent = mostrar ? "○" : "◉";
});

openLoginButton?.addEventListener("click", abrirTelaLogin);
closeLoginButton?.addEventListener("click", fecharTelaLogin);
loginOverlay?.addEventListener("click", (event) => {
  if (event.target === loginOverlay) fecharTelaLogin();
});

carregarPresentesAdmin();
