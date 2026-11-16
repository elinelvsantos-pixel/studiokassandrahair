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
