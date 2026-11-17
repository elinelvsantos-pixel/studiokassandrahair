from fastapi.testclient import TestClient
from backend.main import app
from backend.services import calcular_sinal_50, concluir_os_e_ratear, criar_pre_reserva

client = TestClient(app)


def test_calculo_sinal_50_unitario():
    assert calcular_sinal_50(80.00) == 40.00
    assert calcular_sinal_50(100.00) == 50.00


def test_criacao_pre_reserva_valida():
    reserva = criar_pre_reserva("Mariana Souza", "(83) 98888-1234", 1, "10:00")
    assert reserva["valor_sinal"] == 40.00
    assert reserva["status"] == "AGUARDANDO_SINAL"
    assert "expira_em" in reserva


def test_rateio_comissao_conclusao_os():
    resultado = concluir_os_e_ratear(valor_total=80.00, percentual_comissao=0.50)
    assert resultado["status_os"] == "CONCLUIDA"
    assert resultado["comissao_profissional"] == 40.00
    assert resultado["liquido_salao"] == 40.00


def test_integracao_fluxo_api_agendamento_e_os():
    resp_servicos = client.get("/api/servicos")
    assert resp_servicos.status_code == 200
    assert len(resp_servicos.json()) >= 1

    resp_reserva = client.post(
        "/api/pre-reservas",
        json={
            "cliente_nome": "Mariana Souza",
            "cliente_whatsapp": "(83) 98888-1234",
            "servico_id": 1,
            "horario": "10:00",
        },
    )
    assert resp_reserva.status_code == 201
    assert resp_reserva.json()["valor_sinal"] == 40.00

    resp_sem_token = client.post("/api/os/104/concluir")
    assert resp_sem_token.status_code == 401

    resp_com_token = client.post(
        "/api/os/104/concluir",
        headers={"Authorization": "Bearer token-jwt-valido"},
    )
    assert resp_com_token.status_code == 200
    assert resp_com_token.json()["comissao_profissional"] == 40.00
