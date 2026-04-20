"""
fix_oba_modal_trigger.py

Adiciona o GATILHO que faltava: abrir o OBAModal automaticamente no
fluxo 'Sou Bariatrico' depois de Avaliar.

Problema diagnosticado:
  - showOBAModal eh declarado (linha 17)
  - OBAModal eh renderizado condicionalmente (linha 253)
  - onFechar/onConcluir chamam setShowOBAModal(false) (linhas 258-259)
  - Mas em LUGAR NENHUM setShowOBAModal(true) eh chamado!
  - Resultado: a anamnese OBA nunca abre, apesar do flag bariatrica estar marcado.

Correcao:
  No handleAvaliar, depois que a avaliacao roda com sucesso, se
  inputs.bariatrica for true, abrir o OBAModal.
"""

from pathlib import Path
import sys

ARQ = Path("src/components/PatientDashboard.jsx")

if not ARQ.exists():
    print(f"ERRO: {ARQ} nao existe.")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# Idempotencia
if "setShowOBAModal(true)" in src:
    print("AVISO: gatilho do OBAModal ja existe. Nada a fazer.")
    sys.exit(0)

# Ancora: a linha 'setTela('resultado')' no final do handleAvaliar,
# logo apos a persistencia no Supabase.
ancora = """      carregarDados()
    }
    setTela('resultado')
  }"""

novo = """      carregarDados()
    }
    setTela('resultado')

    // Se o paciente eh bariatrico, abrir a anamnese OBA logo apos a avaliacao
    if (inputs.bariatrica && res.encontrado) {
      setShowOBAModal(true)
    }
  }"""

if ancora not in src:
    print("ERRO: ancora no handleAvaliar nao encontrada.")
    print("   O arquivo pode ter sido modificado. Nada alterado.")
    sys.exit(1)

src_novo = src.replace(ancora, novo, 1)
ARQ.write_text(src_novo, encoding="utf-8")

print("OK: gatilho setShowOBAModal(true) adicionado no handleAvaliar.")
print()
print("Comportamento agora:")
print("  - Paciente marca 'Bariatrica' (manual ou via flag)")
print("  - Preenche exames e clica Avaliar")
print("  - Avaliacao eritron roda e mostra o resultado")
print("  - OBAModal (anamnese bariatrica) abre AUTOMATICAMENTE")
print("  - Ao concluir/fechar, o modal some e fica so o resultado")
print()
print(f"Arquivo salvo: {ARQ.resolve()}")
print()
print("Proximo passo:")
print('  git add . && git commit -m "fix: abre OBAModal quando bariatrica marcada no Dashboard" && git push origin main')
