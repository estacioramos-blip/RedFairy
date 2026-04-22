"""
diagnostico_virgula_sangria.py

Localiza o padrao 'DOACAO DE SANGUE OU SANGRIA, SE EM REGIME DE SANGRIAS'
(com virgula onde deveria ser ponto) e conta ocorrencias.
"""

from pathlib import Path
import re

padroes = [
    "DOAÇÃO DE SANGUE OU SANGRIA, SE EM REGIME",
    "SANGRIA, SE EM REGIME DE SANGRIAS",
    "SANGRIAS, CERTIFIQUE-SE",
]

arquivos = list(Path("src/engine").rglob("*.js"))

for termo in padroes:
    print(f"\n{'='*70}")
    print(f"BUSCA: '{termo}'")
    print("="*70)
    total = 0
    for path in arquivos:
        if not path.exists():
            continue
        src = path.read_text(encoding="utf-8")
        count = src.count(termo)
        if count > 0:
            total += count
            print(f"  {path}: {count} ocorrencias")
            # Mostrar um exemplo com contexto
            idx = src.find(termo)
            if idx >= 0:
                ini = max(0, idx - 50)
                fim = min(len(src), idx + len(termo) + 50)
                print(f"    exemplo: ...{src[ini:fim]}...")
    print(f"  TOTAL: {total}")

print("\n" + "=" * 70)
print("Cole no chat.")
print("=" * 70)
