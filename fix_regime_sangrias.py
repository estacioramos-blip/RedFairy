"""
fix_regime_sangrias.py

Insere 'SE EM REGIME DE SANGRIAS ' antes de 'CERTIFIQUE-SE DE QUE A
FERRITINA...' em maleMatrix.js e femaleMatrix.js (4 ocorrencias: 2 em
cada arquivo, nas recomendacaoAge1 e recomendacaoAge2 do item
Eritrocitose/Hb acima do normal).

Usa regex para tolerar variacoes de pontuacao/espacamento.

Antes: '...SE INDICADA DOAÇÃO DE SANGUE OU SANGRIA, CERTIFIQUE-SE...'
Depois: '...SE INDICADA DOAÇÃO DE SANGUE OU SANGRIA, SE EM REGIME DE
         SANGRIAS CERTIFIQUE-SE...'
"""

from pathlib import Path
import re
import sys

arquivos = [
    Path("src/engine/maleMatrix.js"),
    Path("src/engine/femaleMatrix.js"),
]

# Regex: captura qualquer coisa antes de 'CERTIFIQUE-SE DE QUE A FERRITINA'
# e insere 'SE EM REGIME DE SANGRIAS ' antes.
# Usamos lookbehind negativo para evitar duplicar se ja foi aplicado.
padrao = re.compile(r'(?<!SE EM REGIME DE SANGRIAS )CERTIFIQUE-SE DE QUE A FERRITINA')
substituicao = 'SE EM REGIME DE SANGRIAS, CERTIFIQUE-SE DE QUE A FERRITINA'

total_modificacoes = 0

for arq in arquivos:
    if not arq.exists():
        print(f"ERRO: {arq} nao existe.")
        sys.exit(1)

    src = arq.read_text(encoding="utf-8")

    # Contagem antes
    n_antes = len(padrao.findall(src))
    if n_antes == 0:
        if 'SE EM REGIME DE SANGRIAS' in src:
            print(f"AVISO: {arq} ja parece ter 'SE EM REGIME DE SANGRIAS'. Pulando.")
        else:
            print(f"AVISO: {arq} nao contem 'CERTIFIQUE-SE DE QUE A FERRITINA'. Pulando.")
        continue

    src_novo = padrao.sub(substituicao, src)
    arq.write_text(src_novo, encoding="utf-8")

    total_modificacoes += n_antes
    print(f"OK: {arq} - {n_antes} ocorrencia(s) modificada(s).")

print(f"\nTotal: {total_modificacoes} ocorrencia(s) atualizadas.")
print()
print("Antes: '...SANGRIA, CERTIFIQUE-SE DE QUE A FERRITINA E SUPERIOR A 100...'")
print("Depois: '...SANGRIA, SE EM REGIME DE SANGRIAS, CERTIFIQUE-SE DE QUE A FERRITINA...'")
print()
print("Proximo passo:")
print('  git add . && git commit -m "fix: acrescenta SE EM REGIME DE SANGRIAS antes de CERTIFIQUE-SE" && git push origin main')
