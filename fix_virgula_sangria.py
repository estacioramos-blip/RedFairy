"""
fix_virgula_sangria.py

Corrige erro de pontuacao: virgula onde deveria ser ponto,
emendando duas oracoes distintas.

Padrao ERRADO:
  '...DOACAO DE SANGUE OU SANGRIA, SE EM REGIME DE SANGRIAS...'
  '...SANGRIA TERAPEUTICA, SE EM REGIME DE SANGRIAS...'
  '...SUSPEITA DE POLICITEMIA VERA, SE EM REGIME DE SANGRIAS...'

Padrao CORRETO:
  '...DOACAO DE SANGUE OU SANGRIA. SE EM REGIME DE SANGRIAS...'
  etc.
"""

from pathlib import Path
import sys

# Pares (antigo -> novo)
substituicoes = [
    ("DOAÇÃO DE SANGUE OU SANGRIA, SE EM REGIME DE SANGRIAS",
     "DOAÇÃO DE SANGUE OU SANGRIA. SE EM REGIME DE SANGRIAS"),
    ("SANGRIA TERAPÊUTICA, SE EM REGIME DE SANGRIAS",
     "SANGRIA TERAPÊUTICA. SE EM REGIME DE SANGRIAS"),
    ("SUSPEITA DE POLICITEMIA VERA, SE EM REGIME DE SANGRIAS",
     "SUSPEITA DE POLICITEMIA VERA. SE EM REGIME DE SANGRIAS"),
]

arquivos = [
    Path("src/engine/femaleMatrix.js"),
    Path("src/engine/maleMatrix.js"),
]

total_mudancas = 0
for path in arquivos:
    if not path.exists():
        print(f"AVISO: {path} nao existe, pulando.")
        continue
    src = path.read_text(encoding="utf-8")
    mudancas_arquivo = 0
    for antigo, novo in substituicoes:
        count = src.count(antigo)
        if count > 0:
            src = src.replace(antigo, novo)
            mudancas_arquivo += count
            print(f"  {path.name}: '{antigo[:40]}...' -> {count}x substituido")
    if mudancas_arquivo > 0:
        path.write_text(src, encoding="utf-8")
        total_mudancas += mudancas_arquivo
        print(f"  {path.name} salvo: {mudancas_arquivo} mudanca(s) totais.")
    else:
        print(f"  {path.name}: nenhuma mudanca necessaria.")

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("FIX APLICADO!")
print("=" * 60)
print(f"Total de mudancas: {total_mudancas}")
print()
print("ANTES: '...SANGRIA, SE EM REGIME DE SANGRIAS...'")
print("AGORA: '...SANGRIA. SE EM REGIME DE SANGRIAS...'")
print()
print("Virgulas que emendavam 2 oracoes distintas foram trocadas por ponto.")
print()
print("Proximo passo:")
print('  git add . && git commit -m "fix: virgula por ponto em SANGRIA + SE EM REGIME" && git push origin main')
