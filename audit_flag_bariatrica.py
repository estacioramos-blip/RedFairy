"""
audit_flag_bariatrica.py
========================
Script de AUDITORIA (não modifica nada).
Mapeia a jornada da flag bariátrica do Modo Médico até o PatientDashboard.

Objetivo: descobrir se já existe a infraestrutura para:
  - Calculator marcar paciente como bariátrico
  - Gravar flag no Supabase (tabela avaliacoes ou profiles)
  - PatientDashboard ler a flag e abrir OBAModal automaticamente

Saída: relatório por arquivo, mostrando linhas-chave.

Como rodar:
    copy /Y "C:\\Users\\Estacio\\Downloads\\audit_flag_bariatrica.py" "C:\\Users\\Estacio\\Desktop\\redfairy\\audit_flag_bariatrica.py"
    cd C:\\Users\\Estacio\\Desktop\\redfairy
    python audit_flag_bariatrica.py
"""

import os
import re

ARQUIVOS = [
    os.path.join("src", "components", "Calculator.jsx"),
    os.path.join("src", "components", "PatientDashboard.jsx"),
    os.path.join("src", "components", "AuthPage.jsx"),
    os.path.join("src", "components", "OBAModal.jsx"),
    os.path.join("src", "components", "ResultCard.jsx"),
    os.path.join("src", "engine", "decisionEngine.js"),
    os.path.join("src", "lib", "supabase.js"),
    os.path.join("src", "App.jsx"),
]

PADROES = [
    (r"bariatric[oa]", "flag bariatrico/bariatrica"),
    (r"bariatric", "termo bariatric"),
    (r"isBariatric", "isBariatric"),
    (r"setBariatric", "setBariatric"),
    (r"obrigaOBA|obriga_oba|forceOBA|force_oba", "trigger OBA"),
    (r"abrirOBA|abrir_oba|openOBA|open_oba", "abertura OBAModal"),
    (r"showOBA|show_oba", "show OBAModal"),
]

PADROES_SUPABASE = [
    (r"\.from\(['\"]avaliacoes['\"]\)", "tabela avaliacoes"),
    (r"\.from\(['\"]profiles['\"]\)", "tabela profiles"),
    (r"\.insert\(", "insert"),
    (r"\.update\(", "update"),
    (r"\.upsert\(", "upsert"),
    (r"\.select\(", "select"),
]

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

def imprimir(achados, prefixo="    "):
    if not achados:
        print(f"{prefixo}(nenhuma ocorrencia)")
        return
    for num, linha, label in achados:
        texto = linha.strip()
        if len(texto) > 110:
            texto = texto[:107] + "..."
        print(f"{prefixo}L{num:<5} [{label}] {texto}")

def auditar_arquivo(caminho):
    if not os.path.exists(caminho):
        print(f"\n  ARQUIVO NAO ENCONTRADO: {caminho}")
        return

    with open(caminho, "r", encoding="utf-8") as f:
        linhas = f.read().splitlines()

    banner(f"ARQUIVO: {caminho}  ({len(linhas)} linhas)", "-")

    print("\n  >> Padroes da flag bariatrica:")
    achados_bari = buscar(linhas, PADROES)
    imprimir(achados_bari)

    if any(t in caminho for t in ["Calculator", "PatientDashboard", "AuthPage", "supabase"]):
        print("\n  >> Operacoes Supabase:")
        achados_sb = buscar(linhas, PADROES_SUPABASE)
        imprimir(achados_sb)

def main():
    print("=" * 70)
    print("  AUDITORIA: Flag Bariatrica - Modo Medico -> Paciente")
    print("=" * 70)

    for arq in ARQUIVOS:
        auditar_arquivo(arq)

    banner("PERGUNTAS-CHAVE QUE O OUTPUT VAI RESPONDER")
    print("""
    1. Calculator marca paciente como bariatrico?
       -> Procurar por checkbox/state 'bariatric' em Calculator.jsx

    2. A flag eh gravada no Supabase (insert/upsert em avaliacoes)?
       -> Procurar por '.insert(' ou '.upsert(' com 'bariatric' em
          Calculator.jsx ou ResultCard.jsx

    3. O PatientDashboard le a flag?
       -> Procurar por 'bariatric' em PatientDashboard.jsx

    4. O OBAModal eh aberto automaticamente para bariatricos?
       -> Procurar por 'OBAModal' / 'abrirOBA' em PatientDashboard.jsx

    Cole o output aqui, eu analiso e proponho proximos passos.
    """)

if __name__ == "__main__":
    main()
