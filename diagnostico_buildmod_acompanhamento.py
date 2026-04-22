"""
diagnostico_buildmod_acompanhamento.py

Verifica o que buildModAcompanhamento faz:
  - Quais campos do form ele consome?
  - Que alertas/mensagens gera?
  - Como trata paciente sem especialista?
"""

from pathlib import Path
import re
import sys

ENG = Path("src/engine/obaEngine.js")
if not ENG.exists():
    print(f"ERRO: {ENG} nao existe."); sys.exit(1)

src = ENG.read_text(encoding="utf-8")
linhas = src.splitlines()

# Achar buildModAcompanhamento
print("=" * 70)
print("FUNCAO buildModAcompanhamento COMPLETA")
print("=" * 70)
for i, l in enumerate(linhas):
    if "function buildModAcompanhamento" in l:
        # mostrar ate a proxima 'function' ou export
        for j in range(i, min(len(linhas), i+100)):
            print(f"  {j+1:5d}: {linhas[j][:260]}")
            if j > i + 3 and (linhas[j].strip().startswith("function ") or linhas[j].startswith("export ")):
                break
        break

# Tambem procurar 'acompanhamento', 'especialistas', 'semEspecialista' no engine todo
print("\n\n" + "=" * 70)
print("OCORRENCIAS DE acompanhamento / especialistas / semEspecialista")
print("=" * 70)
for termo in ["acompanhamento", "especialistas", "semEspecialista"]:
    count = src.count(termo)
    print(f"\n  '{termo}': {count} ocorrencias")
    if count > 0:
        for i, l in enumerate(linhas):
            if termo in l:
                print(f"    linha {i+1}: {l.strip()[:220]}")

print("\n" + "=" * 70)
print("Cole no chat.")
print("=" * 70)
