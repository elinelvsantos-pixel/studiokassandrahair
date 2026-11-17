from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from backend.services import CATALOGO_SERVICOS, concluir_os_e_ratear, criar_pre_reserva

app = FastAPI(title="StudioKassandraHair API", version="1.0.0")


class PreReservaInput(BaseModel):
    cliente_nome: str
    cliente_whatsapp: str
    servico_id: int
    horario: str


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "StudioKassandraHair"}


@app.get("/api/servicos")
def listar_servicos():
    return [s for s in CATALOGO_SERVICOS if s["ativo"]]


@app.post("/api/pre-reservas", status_code=201)
def gerar_pre_reserva(dados: PreReservaInput):
    try:
        return criar_pre_reserva(
            cliente_nome=dados.cliente_nome,
            cliente_whatsapp=dados.cliente_whatsapp,
            servico_id=dados.servico_id,
            horario=dados.horario,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/os/{os_id}/concluir")
def concluir_ordem_servico(os_id: int, valor_total: float = 80.0, authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Autenticação JWT obrigatória (RNF01).")
    resultado = concluir_os_e_ratear(valor_total=valor_total)
    return {"os_id": os_id, **resultado}
