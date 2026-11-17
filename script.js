const STORAGE_USERS = "skh_usuarios_v1";
const STORAGE_BOOKINGS = "skh_agendamentos_v1";
const WHATSAPP_SALAO = "5583987547799";

// Carrega profissionais cadastrados no portal de gestão (ou Kassandra como padrão)
function carregarProfissionais() {
  const select = document.getElementById("profissional");
  const usuarios = JSON.parse(localStorage.getItem(STORAGE_USERS) || "[]");

  if (usuarios.length === 0) {
    select.innerHTML = `<option value="prof_padrao">Kassandra (Proprietária — Cabelos & Geral)</option>`;
    return;
  }

  select.innerHTML = usuarios
    .map((u) => `<option value="${u.id}">${u.nome} (${u.especialidade})</option>`)
    .join("");
}

// Atualiza valores de sinal (50%) e duração ao escolher serviço
document.getElementById("servico").addEventListener("change", (e) => {
  const opt = e.target.selectedOptions[0];
  const valor = Number(opt.dataset.valor || 0);
  const duracao = Number(opt.dataset.duracao || 0);
  const box = document.getElementById("box-resumo");

  if (valor <= 0) {
    box.classList.add("hidden");
    return;
  }

  document.getElementById("txt-total").textContent = `R$ ${valor.toFixed(2)}`;
  document.getElementById("txt-sinal").textContent = `R$ ${(valor * 0.5).toFixed(2)}`;
  document.getElementById("txt-duracao").textContent = `${duracao} minutos`;
  box.classList.remove("hidden");
});

// Cópia rápida da chave PIX
document.getElementById("btn-copiar-pix").addEventListener("click", async () => {
  const chave = document.getElementById("chave-pix").value;
  await navigator.clipboard.writeText(chave);
  document.getElementById("feedback-pix").textContent =
    "Chave PIX copiada! Realize o sinal de 50% para garantir o horário.";
});

// Validação de expediente comercial (Terça a Sábado, 09h às 19h)
function validarJanelaComercial(dataStr, horaStr) {
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  const dataObj = new Date(ano, mes - 1, dia);
  const diaSemana = dataObj.getDay(); // 0 = Domingo, 1 = Segunda

  if (diaSemana === 0 || diaSemana === 1) {
    return "O salão funciona apenas de Terça a Sábado. Escolha outra data.";
  }

  const [hora, minuto] = horaStr.split(":").map(Number);
  const totalMin = hora * 60 + minuto;
  if (totalMin < 9 * 60 || totalMin > 19 * 60) {
    return "Horário inválido. Atendemos das 09h00 às 19h00.";
  }

  return null;
}

// Geração da reserva + gravação na agenda interna + envio para WhatsApp
document.getElementById("form-reserva").addEventListener("submit", (e) => {
  e.preventDefault();
  const erroEl = document.getElementById("erro-horario");
  erroEl.classList.add("hidden");

  const nome = document.getElementById("cliente-nome").value.trim();
  const telefone = document.getElementById("cliente-telefone").value.trim();
  const selProf = document.getElementById("profissional");
  const selServ = document.getElementById("servico");
  const optServ = selServ.selectedOptions[0];
  const data = document.getElementById("data-reserva").value;
  const hora = document.getElementById("hora-reserva").value;

  const erroHorario = validarJanelaComercial(data, hora);
  if (erroHorario) {
    erroEl.textContent = erroHorario;
    erroEl.classList.remove("hidden");
    return;
  }

  const valorTotal = Number(optServ.dataset.valor);
  const duracaoMin = Number(optServ.dataset.duracao);
  const sinal = valorTotal * 0.5;

  // Salva agendamento na fila do profissional escolhido (visível em gestao.html)
  const agendamentos = JSON.parse(localStorage.getItem(STORAGE_BOOKINGS) || "[]");
  agendamentos.push({
    id: "ag_" + Date.now(),
    cliente: nome,
    telefone,
    profissionalId: selProf.value,
    profissionalNome: selProf.selectedOptions[0].text,
    servico: selServ.value,
    duracaoMin,
    valorTotal,
    data,
    hora,
    status: "Aguardando Sinal",
    criadoEm: new Date().toISOString()
  });
  localStorage.setItem(STORAGE_BOOKINGS, JSON.stringify(agendamentos));

  // Monta mensagem estruturada para o WhatsApp
  const dataFormatada = data.split("-").reverse().join("/");
  const mensagem =
    `Olá, StudioKassandraHair! Gostaria de confirmar minha pré-reserva:\n\n` +
    `*Cliente:* ${nome}\n` +
    `*Profissional:* ${selProf.selectedOptions[0].text}\n` +
    `*Serviço:* ${selServ.value} (${duracaoMin} min)\n` +
    `*Data/Hora:* ${dataFormatada} às ${hora}\n` +
    `*Valor Total:* R$ ${valorTotal.toFixed(2)}\n` +
    `*Sinal (50% via PIX):* R$ ${sinal.toFixed(2)}\n\n` +
    `_Segue em anexo o comprovante do PIX (validade da pré-reserva: 15 min)._`;

  window.open(`https://wa.me/${WHATSAPP_SALAO}?text=${encodeURIComponent(mensagem)}`, "_blank");
});

// Modo Alto Contraste WCAG 2.1 AA
document.getElementById("btn-contraste").addEventListener("click", (e) => {
  const ativo = document.body.classList.toggle("alto-contraste");
  e.target.setAttribute("aria-pressed", String(ativo));
});

carregarProfissionais();
