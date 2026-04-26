"""
read_resultcard_para_texto3.py
==============================
Script de LEITURA (não modifica nada).
Inspeciona o ResultCard.jsx para encontrar:
  1. Assinatura do componente (props recebidas)
  2. Mensagens de "avaliação salva/concluída" existentes
  3. Onde a flag 'bariatrica' é usada (ResultCard L1015 já achamos)
  4. Onde props 'cpf' e 'sexo' aparecem
  5. Estrutura geral (h1/h2, seções, divs principais)

Objetivo: descobrir o melhor ponto para inserir a mensagem do Texto 3:
  "Avaliação salva sob o CPF do paciente. Ao se cadastrar, ele(a) terá
   acesso ao Projeto OBA — Otimizar o Bariátrico."

Como rodar:
    copy /Y "C:\\Users\\Estacio\\Downloads\\read_resultcard_para_texto3.py" "C:\\Users\\Estacio\\Desktop\\redfairy\\read_resultcard_para_texto3.py"
    cd C:\\Users\\Estacio\\Desktop\\redfairy
    python read_resultcard_para_texto3.py
"""

import os
import re
import sys

ARQUIVO = os.path.join("src", "components", "ResultCard.jsx")

def banner(titulo, char="="):
    print("\n" + char * 70)
    print(f"  {titulo}")
    print(char * 70)

def buscar(linhas, padroes):
    achados = []
    for i, linha in enumerate(linhas):
        for padrao, label in padroes:
            if re.search(padrao, linha, re.IGNORECASE):
                achados.append((i + 1, linha.rstrip(), label))
                break
    return achados

def imprimir(achados, prefixo="    ", limite=None):
    if not achados:
        print(f"{prefixo}(nenhuma ocorrencia)")
        return
    items = achados[:limite] if limite else achados
    for num, linha, label in items:
        texto = linha.strip()
        if len(texto) > 120:
            texto = texto[:117] + "..."
        print(f"{prefixo}L{num:<5} [{label}] {texto}")
    if limite and len(achados) > limite:
        print(f"{prefixo}... e mais {len(achados) - limite} ocorrencia(s)")

def imprimir_regiao(linhas, centro, antes=8, depois=15):
    """Mostra uma regiao de codigo com contexto."""
    ini = max(0, centro - antes - 1)
    fim = min(len(linhas), centro + depois)
    for i in range(ini, fim):
        num = i + 1
        marca = " >>>" if num == centro else "    "
        linha = linhas[i].rstrip()
        if len(linha) > 130:
            linha = linha[:127] + "..."
        print(f"{marca} L{num:<5}: {linha}")

def main():
    if not os.path.exists(ARQUIVO):
        print(f"ERRO: Arquivo nao encontrado: {ARQUIVO}")
        sys.exit(1)

    with open(ARQUIVO, "r", encoding="utf-8") as f:
        linhas = f.read().splitlines()

    print(f"Arquivo: {ARQUIVO}")
    print(f"Total de linhas: {len(linhas)}")

    # 1. Assinatura do componente
    banner("1. ASSINATURA DO COMPONENTE (props recebidas)")
    achados_sig = buscar(
        linhas,
        [
            (r"function\s+ResultCard", "function"),
            (r"const\s+ResultCard\s*=", "const"),
            (r"export\s+default\s+function\s+ResultCard", "export default function"),
            (r"export\s+default\s+ResultCard", "export default"),
        ],
    )
    if achados_sig:
        for num, _, _ in achados_sig:
            print(f"\n  Regiao em L{num}:")
            imprimir_regiao(linhas, num, antes=2, depois=8)

    # 2. Mensagens de "avaliacao salva/concluida"
    banner("2. MENSAGENS RELEVANTES (avaliacao, salva, concluida, gravada)")
    achados_msg = buscar(
        linhas,
        [
            (r"avalia[cç][aã]o", "avaliacao"),
            (r"salva[d]?[ao]?", "salva"),
            (r"conclu[ií]d[ao]", "concluida"),
            (r"gravad[ao]", "gravada"),
            (r"finaliza[d]?[ao]?", "finalizada"),
        ],
    )
    imprimir(achados_msg, limite=20)

    # 3. Uso de 'bariatrica' (ja sabemos L1015)
    banner("3. USO DE 'bariatrica' NO RESULTCARD")
    achados_bari = buscar(linhas, [(r"bariatric[oa]?", "bariatrica")])
    imprimir(achados_bari)
    if achados_bari:
        for num, _, _ in achados_bari:
            print(f"\n  Regiao em L{num}:")
            imprimir_regiao(linhas, num, antes=5, depois=10)

    # 4. Props cpf, sexo, inputs
    banner("4. PROPS / INPUTS QUE TEMOS DISPONIVEIS")
    achados_props = buscar(
        linhas,
        [
            (r"\binputs\.", "inputs"),
            (r"props\.cpf", "props.cpf"),
            (r"props\.sexo", "props.sexo"),
            (r"\bcpf\b", "cpf"),
        ],
    )
    imprimir(achados_props, limite=15)

    # 5. Headers/secoes (entender estrutura)
    banner("5. ESTRUTURA - h1/h2/h3 e secoes principais")
    achados_estrutura = buscar(
        linhas,
        [
            (r"<h1", "h1"),
            (r"<h2", "h2"),
            (r"<h3", "h3"),
            (r"<section", "section"),
        ],
    )
    imprimir(achados_estrutura, limite=15)

    # 6. Inicio e fim do return
    banner("6. RETURN PRINCIPAL DO COMPONENTE")
    achados_return = buscar(linhas, [(r"^\s*return\s*\(", "return")])
    imprimir(achados_return, limite=5)
    if achados_return:
        primeiro_return = achados_return[0][0]
        print(f"\n  Regiao do primeiro return em L{primeiro_return}:")
        imprimir_regiao(linhas, primeiro_return, antes=2, depois=15)

    banner("FIM - Cole o output completo no chat")

if __name__ == "__main__":
    main()
