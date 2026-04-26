"""
read_calculator_criticas.py
===========================
Script de LEITURA (não modifica nada).
Lê as 4 regiões críticas do Calculator.jsx que controlam o fluxo OBA no Modo Médico.

Regiões:
  - L693 : auto-abertura do OBAModal quando bariatrica está marcada
  - L1117: checkbox "bariatrica_medico" (Modo Médico)
  - L1216: bloco que renderiza algo quando inputs.bariatrica é true
  - L1229: botão que abre o OBAModal manualmente

Saída: trecho de cada região com ±15 linhas de contexto.

Como rodar:
    copy /Y "C:\\Users\\Estacio\\Downloads\\read_calculator_criticas.py" "C:\\Users\\Estacio\\Desktop\\redfairy\\read_calculator_criticas.py"
    cd C:\\Users\\Estacio\\Desktop\\redfairy
    python read_calculator_criticas.py
"""

import os
import sys

ARQUIVO = os.path.join("src", "components", "Calculator.jsx")

# (linha_central, contexto_antes, contexto_depois, descricao)
REGIOES = [
    (693,  10, 25, "AUTO-ABERTURA OBA (modo medico marca bariatrica)"),
    (1117, 10, 15, "CHECKBOX 'bariatrica_medico' (Modo Medico)"),
    (1216, 8,  20, "BLOCO RENDERIZADO QUANDO inputs.bariatrica = true"),
    (1229, 8,  15, "BOTAO QUE ABRE O OBAModal MANUALMENTE"),
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

    for centro, antes, depois, desc in REGIOES:
        banner(f"L{centro} - {desc}")

        ini = max(0, centro - antes - 1)
        fim = min(len(linhas), centro + depois)

        for i in range(ini, fim):
            num = i + 1
            marca = " >>>" if num == centro else "    "
            linha = linhas[i].rstrip()
            # Trunca linhas muito longas para nao quebrar o terminal
            if len(linha) > 130:
                linha = linha[:127] + "..."
            print(f"{marca} L{num:<5}: {linha}")

    banner("FIM - Cole o output completo no chat")

if __name__ == "__main__":
    main()
