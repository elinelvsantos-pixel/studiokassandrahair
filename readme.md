# StudioKassandraHair — MVP de Agendamento e Rateio

Aplicação web **mobile-first (PWA)** desenvolvida para o salão de beleza **StudioKassandraHair** (João Pessoa/PB), com foco na redução de *no-shows* por meio da cobrança automatizada de **sinal de 50%** (Pix/Cartão) e no cálculo automático de **rateio de comissões** por Ordem de Serviço (ODS 8).

## Funcionalidades do MVP
- **Agendamento Público (`RF01`, `RF05`):** Consulta de serviços ativos e horários disponíveis sem exigência de cadastro prévio (`RNF01`).
- **Pré-Reserva e Sinal 50% (`RF02`, `RF03`):** Bloqueio temporário por 15 minutos, identificação mínima (Nome + WhatsApp) em conformidade com a LGPD (`RNF02`) e confirmação via *webhook*.
- **Painel Profissional e Baixa de OS (`RF04`, `RF06`):** Autenticação JWT, encerramento da Ordem de Serviço, cálculo automático de comissão e geração de link de comprovante/lembrete via `wa.me`.
- **Acessibilidade (`RNF04`):** Conformidade WCAG 2.1 AA (alvos de toque $\ge$ 48px, contraste $\ge$ 4.5:1 e redundância visual em alertas).

## Stack Tecnológica
- **Backend:** Python 3.11 + FastAPI + PostgreSQL + Pytest
- **Frontend:** Angular PWA (HTML5, CSS3 acessível, TypeScript)
- **CI/CD:** GitHub Actions

## Como Executar Localmente
```bash
# Instalar dependências do backend e testes
pip install -r backend/requirements.txt

# Iniciar servidor API
uvicorn backend.main:app --reload

# Executar suíte de testes automatizados
pytest -v

---

### Commit 2 — Dependências e Regras de Negócio do Backend (`backend/requirements.txt` e `backend/services.py`)
*(Para manter 1 arquivo por commit no navegador, crie primeiro `backend/services.py`)*
* **Nome do arquivo:** `backend/services.py`
* **Mensagem do commit:** `feat: implementa regras de pre-reserva, sinal 50% e rateio de comissoes`
* **Conteúdo:**

```python
from datetime import datetime, timedelta
from typing import Dict, List


CATALOGO_SERVICOS = [
    {"id": 1, "nome": "Escova Modelada", "duracao_min": 60, "preco": 80.00, "ativo": True},
    {"id": 2, "nome": "Corte Feminino", "duracao_min": 45, "preco": 70.00, "ativo": True},
    {"id": 3, "nome": "Hidratação Profunda", "duracao_min": 60, "preco": 100.00, "ativo": True},
]


def calcular_sinal_50(valor_total: float) -> float:
    """Calcula o valor exato do sinal obrigatório de 50% (RF02)."""
    if valor_total <= 0:
        raise ValueError("O valor do serviço deve ser maior que zero.")
    return round(valor_total * 0.50, 2)


def criar_pre_reserva(
    cliente_nome: str,
    cliente_whatsapp: str,
    servico_id: int,
    horario: str,
    agora: datetime | None = None,
) -> Dict:
    """Cria uma pré-reserva com validade de 15 minutos antes da expiração (RF02)."""
    if not cliente_nome.strip() or len(cliente_whatsapp.strip()) < 10:
        raise ValueError("Informe nome completo e WhatsApp válido com DDD.")

    servico = next((s for s in CATALOGO_SERVICOS if s["id"] == servico_id and s["ativo"]), None)
    if not servico:
        raise ValueError("Serviço não encontrado ou inativo.")

    instante = agora or datetime.utcnow()
    sinal = calcular_sinal_50(servico["preco"])

    return {
        "cliente_nome": cliente_nome.strip(),
        "cliente_whatsapp": cliente_whatsapp.strip(),
        "servico": servico["nome"],
        "horario": horario,
        "valor_total": servico["preco"],
        "valor_sinal": sinal,
        "status": "AGUARDANDO_SINAL",
        "expira_em": (instante + timedelta(minutes=15)).isoformat(),
    }


def concluir_os_e_ratear(valor_total: float, percentual_comissao: float = 0.50) -> Dict:
    """Dá baixa na Ordem de Serviço e apura comissão da profissional e líquido do salão (RF04)."""
    if not (0 < percentual_comissao < 1):
        raise ValueError("Percentual de comissão inválido.")

    sinal_pago = calcular_sinal_50(valor_total)
    restante_salao = round(valor_total - sinal_pago, 2)
    comissao_profissional = round(valor_total * percentual_comissao, 2)
    liquido_salao = round(valor_total - comissao_profissional, 2)

    return {
        "status_os": "CONCLUIDA",
        "valor_total": valor_total,
        "sinal_pago": sinal_pago,
        "restante_salao": restante_salao,
        "comissao_profissional": comissao_profissional,
        "liquido_salao": liquido_salao,
    }
