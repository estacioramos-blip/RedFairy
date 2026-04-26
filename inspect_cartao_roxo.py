"""
inspect_cartao_roxo.py
======================
Lê o bloco do cartão roxo (L1216-1235) e mostra cada linha com:
  - Número da linha
  - Comprimento (caracteres)
  - Repr Python (mostra espaços, tabs, caracteres invisíveis)

Objetivo: descobrir por que a âncora do fix_modo_medico_oba.py falhou.

Rodar:
    python inspect_cartao_roxo.py
"""

import os
import sys

ARQUIVO = os.path.join("src", "components", "Calculator.jsx")

INI = 1213  # margem de segurança antes
FIM = 1240  # margem de segurança depois

def main():
    if not os.path.exists(ARQUIVO):
        print(f"ERRO: {ARQUIVO} nao encontrado")
        sys.exit(1)

    with open(ARQUIVO, "r", encoding="utf-8") as f:
        linhas = f.read().splitlines()

    print(f"Arquivo: {ARQUIVO}")
    print(f"Total de linhas: {len(linhas)}\n")
    print("Mostrando L{}-L{} em formato repr() para revelar caracteres invisiveis:".format(INI, FIM))
    print("=" * 70)

    for i in range(INI - 1, min(FIM, len(linhas))):
        num = i + 1
        linha = linhas[i]
        print(f"L{num:<5} ({len(linha):>3} chars): {repr(linha)}")

    print("=" * 70)
    print("\nTipos de espacos comuns:")
    print("  ' '       = espaco normal (0x20)")
    print("  '\\t'     = tab (0x09)")
    print("  '\\xa0'   = espaco nao-quebravel (NBSP)")
    print("  '\\u200b' = zero-width space")

if __name__ == "__main__":
    main()
