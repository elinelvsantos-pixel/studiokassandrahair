const STORAGE_USERS = "skh_usuarios_v1";
const STORAGE_BOOKINGS = "skh_agendamentos_v1";
const SESSION_KEY = "skh_sessao_ativa";

// Gera hash SHA-256 para não armazenar senhas em texto puro
async function hashSenha(senha) {
  const encoder = new TextEncoder();
  const data = encoder.encode(senha);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getUsuarios() {
  return JSON.parse(localStorage.getItem(STORAGE_USERS) || "[]");
}

function saveUsuarios(lista) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(lista));
}

function getAgendamentos() {
  return JSON.parse(localStorage.getItem(STORAGE_BOOKINGS) || "[]");
}

function saveAgendamentos(lista) {
  localStorage.setItem(STORAGE_BOOKINGS, JSON.stringify(lista));
}

function getSessao() {
  return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
}

// Inicialização da tela de Autenticação (detecta se já existe proprietária)
function inicializarAuth() {
  const usuarios = getUsuarios();
  const campoNome = document.getElementById("campo-nome-setup");
  const titulo = document.getElementById("auth-titulo");
  const subtitulo = document.getElementById("auth-subtitulo");

  if (usuarios.length === 0) {
    titulo.textContent = "Configuração Inicial — Proprietária";
    subtitulo.textContent = "Crie a conta administradora principal do StudioKassandraHair.";
    campoNome.classList.remove("hidden");
    document.getElementById("auth-nome").required = true;
  } else {
    titulo.textContent = "Acesso da Equipe";
    subtitulo.textContent = "Entre com suas credenciais de proprietária ou parceiro(a).";
    campoNome.classList.add("hidden");
    document.getElementById("auth-nome").required = false;
  }
}

document.getElementById("form-auth").addEventListener("submit", async (e) => {
  e.preventDefault();
  const usuarios = getUsuarios();
  const email = document.getElementById("auth-email").value.trim().toLowerCase();
  const senhaHash = await hashSenha(document.getElementById("auth-senha").value);

  // Primeiro cadastro automático da proprietária
  if (usuarios.length === 0) {
    const novaProprietaria = {
      id: "prof_" + Date.now(),
      nome: document.getElementById("auth-nome").value.trim(),
      especialidade: "Gestão & Cabelos",
      perfil: "proprietaria",
      email,
      senhaHash
    };
    saveUsuarios([novaProprietaria]);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(novaProprietaria));
    abrirPainel();
    return;
  }

  const encontrado = usuarios.find((u) => u.email === email && u.senhaHash === senhaHash);
  if (!encontrado) {
    alert("E-mail ou senha inválidos.");
    return;
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(encontrado));
  abrirPainel();
});

document.getElementById("btn-sair").addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  location.reload();
});

function abrirPainel() {
  const sessao = getSessao();
  if (!sessao) return;

  document.getElementById("sec-auth").classList.add("hidden");
  document.getElementById("sec-painel").classList.remove("hidden");
  document.getElementById("usuario-logado-nome").textContent = `Olá, ${sessao.nome} `;
  document.getElementById("usuario-logado-perfil").textContent =
    sessao.perfil === "proprietaria" ? "Proprietária" : "Parceiro(a)";

  // Restringe cadastro de equipe apenas à proprietária
  if (sessao.perfil !== "proprietaria") {
    document.getElementById("nav-equipe").classList.add("hidden");
  }

  const hoje = new Date();
  document.getElementById("resumo-mes").value =
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

  popularSelectsProfissionais();
  renderizarAgenda();
  renderizarResumoMensal();
  renderizarUsuarios();
}

function popularSelectsProfissionais() {
  const sessao = getSessao();
  const usuarios = getUsuarios();
  const selAgenda = document.getElementById("filtro-profissional");
  const selResumo = document.getElementById("resumo-profissional");

  selAgenda.innerHTML = "";
  selResumo.innerHTML = "";

  if (sessao.perfil === "proprietaria") {
    selAgenda.innerHTML += `<option value="todos">Todos os Profissionais</option>`;
    selResumo.innerHTML += `<option value="todos">Toda a Equipe</option>`;
    usuarios.forEach((u) => {
      selAgenda.innerHTML += `<option value="${u.id}">${u.nome}</option>`;
      selResumo.innerHTML += `<option value="${u.id}">${u.nome}</option>`;
    });
  } else {
    // Parceiro visualiza apenas sua própria agenda e produtividade
    selAgenda.innerHTML = `<option value="${sessao.id}">${sessao.nome}</option>`;
    selResumo.innerHTML = `<option value="${sessao.id}">${sessao.nome}</option>`;
  }
}

// Renderiza lista de agendamentos com botões de Confirmação e Finalização
function renderizarAgenda() {
  const tbody = document.getElementById("lista-agendamentos");
  const profId = document.getElementById("filtro-profissional").value;
  const statusFiltro = document.getElementById("filtro-status").value;
  const agendamentos = getAgendamentos();

  const filtrados = agendamentos.filter((item) => {
    const matchProf = profId === "todos" || item.profissionalId === profId;
    const matchStatus = statusFiltro === "todos" || item.status === statusFiltro;
    return matchProf && matchStatus;
  });

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">Nenhum agendamento encontrado para este filtro.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtrados
    .sort((a, b) => `${a.data}T${a.hora}`.localeCompare(`${b.data}T${b.hora}`))
    .map((ag) => {
      const badgeClass =
        ag.status === "Finalizado"
          ? "badge-finalizado"
          : ag.status === "Confirmado"
          ? "badge-confirmado"
          : ag.status === "Cancelado"
          ? "badge-cancelado"
          : "badge-pendente";

      return `
        <tr>
          <td>${ag.data.split("-").reverse().join("/")} às ${ag.hora}</td>
          <td><strong>${ag.cliente}</strong><br><small>${ag.telefone || ""}</small></td>
          <td>${ag.profissionalNome}</td>
          <td>${ag.servico} (${ag.duracaoMin} min)</td>
          <td>R$ ${ag.valorTotal.toFixed(2)}<br><small>Sinal: R$ ${(ag.valorTotal * 0.5).toFixed(2)}</small></td>
          <td><span class="badge ${badgeClass}">${ag.status}</span></td>
          <td>
            ${
              ag.status === "Aguardando Sinal"
                ? `<button class="btn-acao btn-confirmar" onclick="alterarStatus('${ag.id}', 'Confirmado')">Confirmar PIX</button>`
                : ""
            }
            ${
              ag.status === "Confirmado" || ag.status === "Aguardando Sinal"
                ? `<button class="btn-acao btn-finalizar" onclick="alterarStatus('${ag.id}', 'Finalizado')">Finalizar Serviço</button>
                   <button class="btn-acao btn-cancelar" onclick="alterarStatus('${ag.id}', 'Cancelado')">Cancelar</button>`
                : "—"
            }
          </td>
        </tr>
      `;
    })
    .join("");
}

window.alterarStatus = function (id, novoStatus) {
  const lista = getAgendamentos().map((ag) =>
    ag.id === id ? { ...ag, status: novoStatus, atualizadoEm: new Date().toISOString() } : ag
  );
  saveAgendamentos(lista);
  renderizarAgenda();
  renderizarResumoMensal();
};

// Resumo Mensal de Produtividade
function renderizarResumoMensal() {
  const mesSelecionado = document.getElementById("resumo-mes").value; // YYYY-MM
  const profFiltro = document.getElementById("resumo-profissional").value;
  const agendamentos = getAgendamentos().filter((ag) => ag.data.startsWith(mesSelecionado));

  const doEscopo = agendamentos.filter(
    (ag) => profFiltro === "todos" || ag.profissionalId === profFiltro
  );

  const finalizados = doEscopo.filter((ag) => ag.status === "Finalizado");
  const validos = doEscopo.filter((ag) => ag.status !== "Aguardando Sinal");
  const faturamento = finalizados.reduce((acc, ag) => acc + ag.valorTotal, 0);
  const minutosTotais = finalizados.reduce((acc, ag) => acc + Number(ag.duracaoMin || 0), 0);
  const horas = Math.floor(minutosTotais / 60);
  const mins = minutosTotais % 60;
  const taxaComparecimento =
    validos.length > 0 ? Math.round((finalizados.length / validos.length) * 100) : 0;

  document.getElementById("kpi-finalizados").textContent = finalizados.length;
  document.getElementById("kpi-faturamento").textContent = `R$ ${faturamento.toFixed(2)}`;
  document.getElementById("kpi-horas").textContent = `${horas}h ${String(mins).padStart(2, "0")}min`;
  document.getElementById("kpi-comparecimento").textContent = `${taxaComparecimento}%`;

  // Tabela consolidada por profissional no mês
  const usuarios = getUsuarios();
  const tbody = document.getElementById("tabela-produtividade-equipe");
  tbody.innerHTML = usuarios
    .map((u) => {
      const servicosProf = agendamentos.filter(
        (ag) => ag.profissionalId === u.id && ag.status === "Finalizado"
      );
      const minProf = servicosProf.reduce((acc, ag) => acc + Number(ag.duracaoMin || 0), 0);
      const recProf = servicosProf.reduce((acc, ag) => acc + ag.valorTotal, 0);
      return `
        <tr>
          <td><strong>${u.nome}</strong></td>
          <td>${u.especialidade}</td>
          <td>${servicosProf.length}</td>
          <td>${Math.floor(minProf / 60)}h ${String(minProf % 60).padStart(2, "0")}min</td>
          <td>R$ ${recProf.toFixed(2)}</td>
        </tr>
      `;
    })
    .join("");
}

// Cadastro de Parceiros pela Proprietária
document.getElementById("form-novo-usuario").addEventListener("submit", async (e) => {
  e.preventDefault();
  const usuarios = getUsuarios();
  const email = document.getElementById("novo-email").value.trim().toLowerCase();

  if (usuarios.some((u) => u.email === email)) {
    alert("Já existe um usuário cadastrado com este e-mail.");
    return;
  }

  const novo = {
    id: "prof_" + Date.now(),
    nome: document.getElementById("novo-nome").value.trim(),
    especialidade: document.getElementById("novo-especialidade").value.trim(),
    perfil: document.getElementById("novo-perfil").value,
    email,
    senhaHash: await hashSenha(document.getElementById("novo-senha").value)
  };

  usuarios.push(novo);
  saveUsuarios(usuarios);
  e.target.reset();
  popularSelectsProfissionais();
  renderizarUsuarios();
  renderizarResumoMensal();
  alert("Profissional cadastrado com sucesso!");
});

function renderizarUsuarios() {
  const tbody = document.getElementById("lista-usuarios");
  tbody.innerHTML = getUsuarios()
    .map(
      (u) => `
      <tr>
        <td>${u.nome}</td>
        <td>${u.especialidade}</td>
        <td>${u.perfil === "proprietaria" ? "Proprietária" : "Parceiro(a)"}</td>
        <td>${u.email}</td>
      </tr>
    `
    )
    .join("");
}

// Navegação entre abas
document.querySelectorAll(".tab-btn[data-tab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn[data-tab]").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.add("hidden"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.remove("hidden");
  });
});

document.getElementById("filtro-profissional").addEventListener("change", renderizarAgenda);
document.getElementById("filtro-status").addEventListener("change", renderizarAgenda);
document.getElementById("resumo-mes").addEventListener("change", renderizarResumoMensal);
document.getElementById("resumo-profissional").addEventListener("change", renderizarResumoMensal);

// Boot
if (getSessao()) {
  abrirPainel();
} else {
  inicializarAuth();
}
