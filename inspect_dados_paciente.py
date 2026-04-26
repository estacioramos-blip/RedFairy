"""
inspect_dados_paciente.py
=========================
Lê a região L1108-1135 do Calculator.jsx em formato repr().
"""

import os
import sys

ARQUIVO = os.path.join("src", "components", "Calculator.jsx")
INI = 1108
FIM = 1140

def main():
    if not os.path.exists(ARQUIVO):
        print(f"ERRO: {ARQUIVO} nao encontrado")
        sys.exit(1)

    with open(ARQUIVO, "r", encoding="utf-8") as f:
        linhas = f.read().splitlines()

    print(f"Arquivo: {ARQUIVO}")
    print(f"Total: {len(linhas)} linhas\n")
    print(f"L{INI}-L{FIM} em repr():")
    print("=" * 70)
    for i in range(INI - 1, min(FIM, len(linhas))):
        num = i + 1
        print(f"L{num}: {repr(linhas[i])}")

if __name__ == "__main__":
    main()
