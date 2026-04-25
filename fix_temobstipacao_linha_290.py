"""
fix_temObstipacao_linha_290.py

Corrige a ultima referencia de temObstipacao (linha 290) para
temObstipacaoModulo.
"""
from pathlib import Path

RC = Path("src/components/ResultCard.jsx")
src = RC.read_text(encoding="utf-8")

antigo = "{temObstipacao && ("
novo = "{temObstipacaoModulo && ("

if antigo in src:
    src = src.replace(antigo, novo, 1)
    RC.write_text(src, encoding="utf-8")
    print("OK: linha 290 corrigida.")
else:
    print(f"AVISO: '{antigo}' nao encontrado.")

# Verificacao final
src = RC.read_text(encoding="utf-8")
count = 0
for l in src.splitlines():
    # Qualquer uso de temObstipacao que NAO seja temObstipacaoModulo
    if "temObstipacao" in l and "temObstipacaoModulo" not in l:
        count += 1
        print(f"  AINDA TEM: {l.strip()}")

if count == 0:
    print("VERIFICACAO FINAL: 0 ocorrencias orfas. Tudo limpo!")

print()
print("Proximo:")
print("  npm run build")
print("  npm run preview")
