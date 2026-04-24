"""
fix_calculator_passar_ferro.py

Bug 1 real: O Calculator NAO esta passando ferro_oral e ferro_injetavel
na prop dadosRedFairy do OBAModal. Esses 2 campos ficam indefinidos
no OBAModal, fazendo o useEffect de pre-marcacao nao encontrar nada
para marcar.

Fix: adicionar as 2 linhas a prop dadosRedFairy.
"""

from pathlib import Path
import sys

ARQ = Path("src/components/Calculator.jsx")
src = ARQ.read_text(encoding="utf-8")

ancora = """          dadosRedFairy={{
            gestante: inputs.gestante,
            semanas_gestacao: inputs.semanas_gestacao ? Number(inputs.semanas_gestacao) : null,
            dum: inputs.dum || null,
          }}"""

novo = """          dadosRedFairy={{
            gestante: inputs.gestante,
            semanas_gestacao: inputs.semanas_gestacao ? Number(inputs.semanas_gestacao) : null,
            dum: inputs.dum || null,
            ferro_oral: inputs.ferro_oral || false,
            ferro_injetavel: inputs.ferro_injetavel || false,
          }}"""

if "ferro_oral: inputs.ferro_oral" in src:
    print("AVISO: ferro_oral ja foi adicionado anteriormente.")
elif ancora in src:
    src = src.replace(ancora, novo, 1)
    ARQ.write_text(src, encoding="utf-8")
    print("OK: ferro_oral e ferro_injetavel agora sao passados ao OBAModal.")
else:
    print("ERRO: ancora nao encontrada.")
    sys.exit(1)

print("\n" + "=" * 60)
print("FIX 1 APLICADO!")
print("=" * 60)
print()
print("O Calculator agora passa ferro_oral e ferro_injetavel em dadosRedFairy.")
print("O useEffect no OBAModal (linhas 210-221) ja esta correto esperando esses campos.")
print()
print("Proximo passo:")
print('  git add . && git commit -m "fix: Calculator passa ferro_oral/ferro_injetavel ao OBAModal" && git push origin main')
