"""
diagnostico_frase_16_17.py

Mapeia todas as variacoes da frase sobre autorizacao de responsaveis
(16-17 anos) em todas as matrizes e engine, pra eu criar o regex
correto no fix.
"""

from pathlib import Path
import re

termos = [
    "ENTRE 16 E 17 ANOS",
    "entre 16 e 17 anos",
    "16 E 17 ANOS DE IDADE",
    "16 a 17 anos",
    "AUTORIZAÇÃO DOS RESPONSÁVEIS",
    "autorização dos responsáveis",
    "RESPONSÁVEIS LEGAIS",
]

arquivos = list(Path("src/engine").rglob("*.js"))

print("=" * 70)
print("CONTAGEM POR TERMO")
print("=" * 70)
for termo in termos:
    total = 0
    for path in arquivos:
        if path.exists():
            total += path.read_text(encoding="utf-8").count(termo)
    print(f"  '{termo[:45]}...': {total}")

print("\n\n" + "=" * 70)
print("AMOSTRAS COMPLETAS (3 exemplos de cada arquivo relevante)")
print("=" * 70)

# Buscar ocorrencias reais e mostrar a linha inteira para entender a estrutura
for path in arquivos:
    if not path.exists():
        continue
    src = path.read_text(encoding="utf-8")
    if "ENTRE 16 E 17 ANOS" in src or "16 e 17 anos" in src.lower():
        print(f"\n######### {path} #########")
        linhas = src.splitlines()
        encontrados = 0
        for i, l in enumerate(linhas):
            if encontrados >= 3:
                break
            if "16 E 17 ANOS" in l.upper() or "16 e 17 anos" in l:
                encontrados += 1
                # encontrar a frase completa — comeca com "ENTRE" e termina com "."
                # Vou mostrar a linha completa mas limitada
                print(f"\n  --- linha {i+1} ---")
                trecho = l.strip()
                if len(trecho) > 400:
                    trecho = trecho[:400] + "..."
                print(f"    {trecho}")

# Tambem mostrar se a frase vem junto com outras variacoes antes/depois
print("\n\n" + "=" * 70)
print("ESTRUTURA TIPICA: antes e depois da frase (3 exemplos)")
print("=" * 70)

path = Path("src/engine/femaleMatrix.js")
if path.exists():
    src = path.read_text(encoding="utf-8")
    # Achar todas as ocorrencias e mostrar 100 chars antes e 150 depois
    padrao = re.compile(r'ENTRE 16 E 17 ANOS.*?(?=\"|$)', re.DOTALL)
    encontrados = 0
    for m in padrao.finditer(src):
        if encontrados >= 3:
            break
        encontrados += 1
        ini = max(0, m.start() - 80)
        fim = min(len(src), m.end() + 20)
        trecho = src[ini:fim].replace("\n", " ")
        print(f"\n  amostra {encontrados}: ...{trecho}...")

print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
