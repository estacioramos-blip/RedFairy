"""
fix_ferritina_subtexto_laranja.py

Muda a cor do subtexto de alerta do campo Ferritina no PatientDashboard
de cinza (text-gray-400) para laranja (text-orange-600), dando destaque
ao aviso "Nao use ponto para valores superiores a 1000. Ex: 1140".
"""

from pathlib import Path
import sys

ARQ = Path("src/components/PatientDashboard.jsx")

if not ARQ.exists():
    print(f"ERRO: arquivo nao encontrado: {ARQ.resolve()}")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# Idempotencia
if 'text-orange-600 font-medium mt-1">{f.hint}' in src:
    print("AVISO: subtexto ja esta em laranja. Nada a fazer.")
    sys.exit(0)

ancora = '{f.hint && <p className="text-xs text-gray-400 mt-1">{f.hint}</p>}'
novo   = '{f.hint && <p className="text-xs text-orange-600 font-medium mt-1">{f.hint}</p>}'

if ancora not in src:
    print("ERRO: ancora do subtexto da Ferritina nao encontrada.")
    print("   Verifique se o script add_subtexto_ferritina.py foi aplicado antes.")
    sys.exit(1)

src_novo = src.replace(ancora, novo, 1)
ARQ.write_text(src_novo, encoding="utf-8")

print("OK: subtexto da Ferritina agora em LARANJA (text-orange-600) com peso medio.")
print()
print(f"Arquivo salvo: {ARQ.resolve()}")
print()
print("Proximo passo:")
print('  git add . && git commit -m "style: subtexto Ferritina em laranja para destaque" && git push origin main')
