const STORAGE_USERS = "skh_usuarios_v1";
const STORAGE_BOOKINGS = "skh_agendamentos_v1";
const WHATSAPP_SALAO = "5583987547799"; // Número do WhatsApp do StudioKassandraHair

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

// Geração da reserva + gravação na agenda interna + comprovante na tela + WhatsApp
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
  const codigoReserva = "SKH-" + String(Date.now()).slice(-5);
  const profissionalNome = selProf.selectedOptions[0].text;

  // Salva agendamento na fila do profissional escolhido (visível em gestao.html)
  const agendamentos = JSON.parse(localStorage.getItem(STORAGE_BOOKINGS) || "[]");
  agendamentos.push({
    id: "ag_" + Date.now(),
    codigo: codigoReserva,
    cliente: nome,
    telefone,
    profissionalId: selProf.value,
    profissionalNome,
    servico: selServ.value,
    duracaoMin,
    valorTotal,
    data,
    hora,
    status: "Aguardando Sinal",
    criadoEm: new Date().toISOString()
  });
  localStorage.setItem(STORAGE_BOOKINGS, JSON.stringify(agendamentos));

  const dataFormatada = data.split("-").reverse().join("/");

  // 1. Preenche e exibe o Cartão de Comprovante Instantâneo na Tela da Cliente
  document.getElementById("detalhes-comprovante").innerHTML = `
    <p style="margin:0.25rem 0;"><strong>Código da Reserva:</strong> ${codigoReserva}</p>
    <p style="margin:0.25rem 0;"><strong>Cliente:</strong> ${nome}</p>
    <p style="margin:0.25rem 0;"><strong>Profissional:</strong> ${profissionalNome}</p>
    <p style="margin:0.25rem 0;"><strong>Serviço:</strong> ${selServ.value} (${duracaoMin} min)</p>
    <p style="margin:0.25rem 0;"><strong>Data e Horário:</strong> ${dataFormatada} às ${hora}</p>
    <p style="margin:0.25rem 0;"><strong>Valor Total:</strong> R$ ${valorTotal.toFixed(2)} | <strong>Sinal PIX (50%):</strong> R$ ${sinal.toFixed(2)}</p>
    <p style="margin:0.25rem 0;"><strong>Chave PIX:</strong> ${document.getElementById("chave-pix").value}</p>
  `;

  // 2. Configura o botão para a própria cliente salvar o comprovante no WhatsApp dela
  const telLimpo = telefone.replace(/\D/g, "");
  const numeroCliente = telLimpo.startsWith("55") ? telLimpo : `55${telLimpo}`;
  const msgParaCliente =
    `*COMPROVANTE DE PRÉ-RESERVA — StudioKassandraHair*\n\n` +
    `*Código:* ${codigoReserva}\n` +
    `*Cliente:* ${nome}\n` +
    `*Profissional:* ${profissionalNome}\n` +
    `*Serviço:* ${selServ.value} (${duracaoMin} min)\n` +
    `*Data/Hora:* ${dataFormatada} às ${hora}\n` +
    `*Valor Total:* R$ ${valorTotal.toFixed(2)}\n` +
    `*Sinal PIX (50%):* R$ ${sinal.toFixed(2)} (Chave: ${document.getElementById("chave-pix").value})\n\n` +
    `_Lembrete: envie o comprovante do PIX para o salão em até 15 minutos para confirmar o horário._`;

  document.getElementById("link-whatsapp-cliente").href =
    `https://wa.me/${numeroCliente}?text=${encodeURIComponent(msgParaCliente)}`;

  const secComprovante = document.getElementById("sec-comprovante");
  secComprovante.classList.remove("hidden");
  secComprovante.scrollIntoView({ behavior: "smooth" });

  // 3. Abre o WhatsApp do Salão para envio imediato do comprovante PIX
  const msgParaSalao =
    `Olá, StudioKassandraHair! Gostaria de confirmar minha pré-reserva (${codigoReserva}):\n\n` +
    `*Cliente:* ${nome}\n` +
    `*Profissional:* ${profissionalNome}\n` +
    `*Serviço:* ${selServ.value} (${duracaoMin} min)\n` +
    `*Data/Hora:* ${dataFormatada} às ${hora}\n` +
    `*Valor Total:* R$ ${valorTotal.toFixed(2)}\n` +
    `*Sinal (50% via PIX):* R$ ${sinal.toFixed(2)}\n\n` +
    `_Segue em anexo o comprovante do PIX (validade da pré-reserva: 15 min)._`;

  window.open(`https://wa.me/${WHATSAPP_SALAO}?text=${encodeURIComponent(msgParaSalao)}`, "_blank");
});

// Botão para limpar e iniciar um novo agendamento
document.getElementById("btn-novo-agendamento").addEventListener("click", () => {
  document.getElementById("form-reserva").reset();
  document.getElementById("box-resumo").classList.add("hidden");
  document.getElementById("sec-comprovante").classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Modo Alto Contraste WCAG 2.1 AA
document.getElementById("btn-contraste").addEventListener("click", (e) => {
  const ativo = document.body.classList.toggle("alto-contraste");
  e.target.setAttribute("aria-pressed", String(ativo));
});

carregarProfissionais();
