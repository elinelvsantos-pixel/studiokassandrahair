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
