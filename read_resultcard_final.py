"""
read_resultcard_final.py
========================
Script de LEITURA (não modifica nada).
Lê duas regiões do ResultCard.jsx para definir ponto exato de inserção do Texto 3:

  - L490-560 : região do precedente "Doutor: esse paciente precisa de..."
              (estilo visual a copiar)

  - L990-1060: região do resultado principal (h3 com resultado.label)
              (onde inserir o Texto 3)

Como rodar:
    copy /Y "C:\\Users\\Estacio\\Downloads\\read_resultcard_final.py" "C:\\Users\\Estacio\\Desktop\\redfairy\\read_resultcard_final.py"
    cd C:\\Users\\Estacio\\Desktop\\redfairy
    python read_resultcard_final.py
"""

import os
import sys

ARQUIVO = os.path.join("src", "components", "ResultCard.jsx")

REGIOES = [
    (490, 560, "PRECEDENTE - mensagem 'Doutor: esse paciente precisa de...' (L528)"),
    (990, 1075, "RESULTADO PRINCIPAL - h3 + flagsAtivas + onde inserir Texto 3"),
]

def banner(titulo, char="="):
    print("\n" + char * 70)
    print(f"  {titulo}")
    print(char * 70)

def main():
    if not os.path.exists(ARQUIVO):
        print(f"ERRO: Arquivo nao encontrado: {ARQUIVO}")
        sys.exit(1)

    with open(ARQUIVO, "r", encoding="utf-8") as f:
        linhas = f.read().splitlines()

    print(f"Arquivo: {ARQUIVO}")
    print(f"Total de linhas: {len(linhas)}")

    for ini, fim, desc in REGIOES:
        banner(desc)
        for i in range(ini - 1, min(fim, len(linhas))):
            num = i + 1
            linha = linhas[i].rstrip()
            if len(linha) > 130:
                linha = linha[:127] + "..."
            print(f"    L{num:<5}: {linha}")

    banner("FIM - Cole o output completo no chat")

if __name__ == "__main__":
    main()
