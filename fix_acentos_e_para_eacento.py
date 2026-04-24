"""
fix_acentos_e_para_eacento.py

Corrige 'E' que deveria ser 'É' nas matrizes.

Estrategia conservadora:
  1. Primeiro LISTA todas ocorrencias suspeitas com contexto
  2. Faz substituicoes SEGURAS (contextos onde 'E' eh verbal, nao conjuncao)

Casos seguros detectados:
  - 'ETARIA E IMPORTANTE' -> 'ETARIA E IMPORTANTE'
  - 'NECESSARIO. E ' -> 'NECESSARIO. E ' (comeco de frase)
  - Outros contextos serao listados para revisao manual
"""
from pathlib import Path
import re

arquivos = [
    ("maleMatrix",   Path("src/engine/maleMatrix.js")),
    ("femaleMatrix", Path("src/engine/femaleMatrix.js")),
]

# Padroes SEGUROS para substituicao automatica
# Em portugues: 'E' + adjetivo geralmente eh 'É' (verbo ser)
# Contextos de conjuncao preservados: ' A E B', ' X E Y', etc.
substituicoes_seguras = [
    # ETARIA E IMPORTANTE
    (r"ETÁRIA E IMPORTANTE",    "ETÁRIA É IMPORTANTE"),
    (r"ETARIA E IMPORTANTE",    "ETARIA É IMPORTANTE"),
    # Outros casos comuns
    (r" E NECESSÁRIO", " É NECESSÁRIO"),
    (r" E NECESSARIO", " É NECESSARIO"),
    (r" E FUNDAMENTAL", " É FUNDAMENTAL"),
    (r" E ESSENCIAL",  " É ESSENCIAL"),
    (r" E RECOMENDÁVEL", " É RECOMENDÁVEL"),
    (r" E OBRIGATÓRIO", " É OBRIGATÓRIO"),
    (r" E POSSIVEL",  " É POSSIVEL"),
    (r" E POSSÍVEL",  " É POSSÍVEL"),
    (r" E COMUM",     " É COMUM"),
    (r" E IMPORTANTE", " É IMPORTANTE"),  # apenas se nao pega conjuncao antes
    (r" E PROVÁVEL",  " É PROVÁVEL"),
    (r" E PROVAVEL",  " É PROVAVEL"),
]

# 1. Listar todas ocorrencias suspeitas primeiro
print("=" * 70)
print("FASE 1: LISTAR OCORRENCIAS SUSPEITAS")
print("=" * 70)

for nome, path in arquivos:
    if not path.exists():
        print(f"{nome}: arquivo nao existe.")
        continue

    src = path.read_text(encoding="utf-8")
    linhas = src.splitlines()

    print(f"\n--- {nome} ---")

    # Buscar padroes suspeitos (palavra+E+palavra sem acento)
    suspeitos = []
    for i, l in enumerate(linhas):
        # Regex: " E " seguido de palavra que comeca com letra (possivel adjetivo/verbo)
        for m in re.finditer(r"(\w+)\s+E\s+([A-ZÁÍÓÚÉÃÇ]\w+)", l):
            antes = m.group(1).upper()
            depois = m.group(2).upper()
            # Filtrar falsos positivos obvios
            # Se antes eh substantivo comum e depois tambem, eh conjuncao
            # Ex: FERRO E VITAMINA, SANGUE E PLAQUETAS
            falsos_positivos_antes = {"FERRO", "VITAMINA", "B12", "SANGUE", "PLAQUETAS", "ÁCIDO", "ACIDO", "FOLATOS", "FÓLICO", "FOLICO", "ZINCO", "HOMOGRAMA", "HEMATOLOGISTA", "NEFROLOGISTA", "GASTROENTEROLOGISTA", "ALBUMINA", "GLOBULINA", "CREATININA", "UREIA", "TSH", "PCR", "VHS", "LDH", "OUTRAS", "OUTROS", "INVESTIGAR", "CAUSAS", "GASTROINTESTINAIS", "ENDOSCOPIA", "COLONOSCOPIA"}
            if antes in falsos_positivos_antes:
                continue
            suspeitos.append((i+1, m.group(0), l[:240]))

    if suspeitos:
        for linha_num, match_txt, contexto in suspeitos[:20]:
            print(f"  Linha {linha_num}: ...{match_txt}...")

        if len(suspeitos) > 20:
            print(f"  ... e mais {len(suspeitos)-20} ocorrencias similares")
    else:
        print(f"  Nenhuma ocorrencia suspeita encontrada.")

# 2. Aplicar substituicoes seguras
print()
print("=" * 70)
print("FASE 2: APLICAR SUBSTITUICOES SEGURAS")
print("=" * 70)

total_geral = 0
for nome, path in arquivos:
    if not path.exists():
        continue

    src = path.read_text(encoding="utf-8")
    mudancas = 0

    for pattern, replacement in substituicoes_seguras:
        count = len(re.findall(pattern, src))
        if count > 0:
            src = re.sub(pattern, replacement, src)
            mudancas += count
            print(f"  {nome}: '{pattern}' -> '{replacement}' ({count}x)")

    if mudancas > 0:
        path.write_text(src, encoding="utf-8")
        print(f"  {nome}: {mudancas} substituicoes salvas.")
        total_geral += mudancas
    else:
        print(f"  {nome}: nenhuma substituicao aplicada.")

print()
print("=" * 70)
print(f"TOTAL: {total_geral} substituicoes aplicadas")
print("=" * 70)

if total_geral > 0:
    print()
    print("Proximo passo:")
    print('  git add . && git commit -m "fix: acentos E -> E com acento nas matrizes" && git push origin main')
else:
    print("Nenhuma mudanca aplicada.")
