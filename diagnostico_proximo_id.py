"""
diagnostico_proximo_id.py

Descobre o proximo ID livre em cada matriz (male e female)
e ver entradas existentes de referencia (ID 90 bariatrico dimorfico,
ID 85 incipiente) para modelar as novas entradas.
"""
from pathlib import Path
import re

for nome, path in [
    ("maleMatrix", Path("src/engine/maleMatrix.js")),
    ("femaleMatrix", Path("src/engine/femaleMatrix.js")),
]:
    if not path.exists():
        print(f"  {path} nao existe."); continue

    src = path.read_text(encoding="utf-8")
    # Achar todos os 'id: NUMERO'
    ids = sorted(set(int(m.group(1)) for m in re.finditer(r"^\s*id:\s*(\d+)\s*,", src, re.MULTILINE)))

    print("=" * 70)
    print(f"{nome}: {len(ids)} entradas")
    print("=" * 70)
    print(f"  Primeiros IDs: {ids[:10]}")
    print(f"  Ultimos IDs:   {ids[-10:]}")
    print(f"  Proximo ID livre (max+1): {max(ids) + 1}")
    print()
    # Total de linhas
    total = len(src.splitlines())
    print(f"  Total linhas: {total}")

# ═════════════════════════════════════════════════════════════════════
# Tambem ver ID 90 (BARIATRICO + DIMORFICO) para modelar a nova
# ═════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("ID 90 NO maleMatrix — entrada completa (modelo)")
print("=" * 70)
MALE = Path("src/engine/maleMatrix.js")
m_src = MALE.read_text(encoding="utf-8")
m_linhas = m_src.splitlines()
for i, l in enumerate(m_linhas):
    if re.search(r"^\s*id:\s*90\s*,", l):
        for j in range(max(0, i-3), min(len(m_linhas), i+35)):
            print(f"  {j+1:5d}: {m_linhas[j][:260]}")
        break

# ═════════════════════════════════════════════════════════════════════
# Ultimas linhas da matriz masculina (para saber onde inserir)
# ═════════════════════════════════════════════════════════════════════
print("\n\n" + "=" * 70)
print("ULTIMAS 15 LINHAS do maleMatrix (final do array)")
print("=" * 70)
for i in range(max(0, len(m_linhas)-15), len(m_linhas)):
    print(f"  {i+1:5d}: {m_linhas[i][:240]}")

print("\n\n" + "=" * 70)
print("ULTIMAS 15 LINHAS do femaleMatrix")
print("=" * 70)
F = Path("src/engine/femaleMatrix.js")
f_linhas = F.read_text(encoding="utf-8").splitlines()
for i in range(max(0, len(f_linhas)-15), len(f_linhas)):
    print(f"  {i+1:5d}: {f_linhas[i][:240]}")

print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
