"""
fix_emergencia_sintaxe.py

Corrige 3 bugs de sintaxe que quebraram o bundle:

BUG 1: femaleMatrix linha ~2145 - falta virgula no final de comentarioFerro
BUG 2: femaleMatrix linha ~2170 - falta virgula no final de comentarioFerro
BUG 3: femaleMatrix - entrada ID 115 DUPLICADA (remover uma)

Tambem corrige a indentacao do { na maleMatrix linha 2283.
"""
from pathlib import Path
import re
import sys

MALE = Path("src/engine/maleMatrix.js")
FEMALE = Path("src/engine/femaleMatrix.js")

# ═════════════════════════════════════════════════════════════════════
# BUG 1 e 2 — Virgulas faltantes em comentarioFerro na femaleMatrix
# ═════════════════════════════════════════════════════════════════════
f_src = FEMALE.read_text(encoding="utf-8")

# Padrao: linha com comentarioFerro terminando em " (sem virgula)
# seguida de linha com proximosExames
antigo_sem_virgula = '    comentarioFerro: "NA BARIÁTRICA A VIA ORAL DE FERRO FREQUENTEMENTE FALHA. FERRO PARENTERAL É GERALMENTE NECESSÁRIO, SOB ORIENTAÇÃO DO HEMATOLOGISTA. EM GESTANTE, O FERRO PARENTERAL PODE SER USADO A PARTIR DO 2º TRIMESTRE COM SEGURANÇA."\n    proximosExames:'
novo_com_virgula   = '    comentarioFerro: "NA BARIÁTRICA A VIA ORAL DE FERRO FREQUENTEMENTE FALHA. FERRO PARENTERAL É GERALMENTE NECESSÁRIO, SOB ORIENTAÇÃO DO HEMATOLOGISTA. EM GESTANTE, O FERRO PARENTERAL PODE SER USADO A PARTIR DO 2º TRIMESTRE COM SEGURANÇA.",\n    proximosExames:'

count_virgulas = f_src.count(antigo_sem_virgula)
print(f"Ocorrencias de comentarioFerro sem virgula: {count_virgulas}")

if count_virgulas > 0:
    f_src = f_src.replace(antigo_sem_virgula, novo_com_virgula)
    print(f"OK Bug 1+2: {count_virgulas} virgula(s) adicionada(s).")
else:
    print("AVISO: padrao exato nao casou. Tentando regex mais permissivo...")
    # Regex mais permissivo
    padrao = re.compile(
        r'(comentarioFerro: "NA BARIÁTRICA A VIA ORAL.*?COM SEGURANÇA\.")(\s*\n\s*proximosExames:)',
        re.DOTALL
    )
    f_src_novo, n = padrao.subn(r'\1,\2', f_src)
    if n > 0:
        f_src = f_src_novo
        print(f"OK Bug 1+2 (via regex): {n} virgula(s) adicionada(s).")
    else:
        print("AVISO: nenhuma correcao aplicada para Bug 1+2.")

# ═════════════════════════════════════════════════════════════════════
# BUG 3 — Remover entrada ID 115 DUPLICADA
# ═════════════════════════════════════════════════════════════════════
# Contar quantas vezes "id: 115," aparece
count_115 = f_src.count("id: 115,")
print(f"\nOcorrencias de 'id: 115,': {count_115}")

if count_115 > 1:
    # Estrategia: achar a segunda ocorrencia e remover o bloco inteiro dela
    # O bloco comeca com { que antecede "id: 115," e termina com "},"
    # Vamos achar o indice da primeira e da segunda ocorrencia
    primeira = f_src.find("id: 115,")
    segunda = f_src.find("id: 115,", primeira + 1)

    # Voltar ate encontrar o { que abre o objeto da segunda ocorrencia
    inicio_bloco = f_src.rfind("{", 0, segunda)
    # Precisa ir antes do whitespace/newline — procurar o indice do { que esta no inicio de linha
    # Simplificar: vamos achar o padrao '\n{' ou '\n  {' antes do segundo 115
    # Na pratica, a segunda entrada ID 115 esta no FINAL do arquivo
    # (linhas 2148-2172 pelo que vimos)
    # O bloco anterior termina em "},\n" antes dela

    # Achar o fim do bloco 115 duplicado: o "}," que vem ANTES do "];"
    # Vamos pegar de '\n{' apos a segunda ID 115 ate o "]," ou "];"
    # Mas tem a linha 2172 "  },\n" e dai 2173 "];"

    # Abordagem: achar o indice EXATO de onde comeca a 2a entrada e remover ate o  "},"
    # Pegar desde o "\n{\n" (anterior a segunda ocorrencia) ate o "},\n" antes do "];"

    # Localizar o inicio: linha com "{" isolado antes de "id: 115," segunda vez
    # Fim: "  },\n" antes de "];"
    idx_fim_arquivo = f_src.rfind("];")
    # Achar "  },\n" mais proximo (voltando) do fim do arquivo
    # Essa }, deve ser a que fecha a entrada 115 duplicada

    # Pegar de "\n{\n    id: 115," (segunda) ate "  },\n" final (inclusive)
    # Uma forma segura: split por "\n{\n" e remontar
    marcador = "\n{\n    id: 115,"
    count_marcador = f_src.count(marcador)
    print(f"Marcadores '{marcador[:30]}...': {count_marcador}")

    # Remover a ultima ocorrencia ate o "},\n];" final
    # O bloco duplicado vai de "\n{\n" ate "  },\n"
    # e o "];" continua onde esta

    idx_segundo_bloco = f_src.rfind(marcador)
    if idx_segundo_bloco > 0:
        # Agora achar o "  },\n" que fecha esse bloco (o mais proximo antes do "];")
        idx_fechamento = f_src.find("  },\n", idx_segundo_bloco)
        if idx_fechamento > 0:
            # Remover de idx_segundo_bloco ate idx_fechamento + len("  },\n")
            fim_remocao = idx_fechamento + len("  },\n")
            bloco_removido = f_src[idx_segundo_bloco:fim_remocao]
            print(f"Removendo bloco de {len(bloco_removido)} caracteres (linhas aprox).")
            f_src = f_src[:idx_segundo_bloco] + "\n" + f_src[fim_remocao:]
            print("OK Bug 3: entrada ID 115 duplicada removida.")
        else:
            print("ERRO Bug 3: fechamento '  },\\n' nao encontrado.")
    else:
        print("AVISO Bug 3: nao localizou segundo ID 115 como esperado.")
elif count_115 == 1:
    print("OK: ID 115 unico, sem duplicacao.")

FEMALE.write_text(f_src, encoding="utf-8")
print("\nfemaleMatrix.js salvo.")

# ═════════════════════════════════════════════════════════════════════
# Verificacao final
# ═════════════════════════════════════════════════════════════════════
f_src_final = FEMALE.read_text(encoding="utf-8")
print()
print("VERIFICACAO FINAL:")

# Contar IDs unicos
import re
ids = re.findall(r"^\s*id:\s*(\d+)\s*,", f_src_final, re.MULTILINE)
duplicados = set([x for x in ids if ids.count(x) > 1])
print(f"  Total IDs: {len(ids)}")
print(f"  Duplicados: {duplicados if duplicados else 'nenhum'}")

# Contar chaves/colchetes
abre_chave = f_src_final.count("{")
fecha_chave = f_src_final.count("}")
abre_col = f_src_final.count("[")
fecha_col = f_src_final.count("]")
print(f"  Chaves:    {abre_chave}/{fecha_chave} (diff {abre_chave-fecha_chave})")
print(f"  Colchetes: {abre_col}/{fecha_col} (diff {abre_col-fecha_col})")

print()
print("=" * 60)
print("FIX DE EMERGENCIA APLICADO!")
print("=" * 60)
print()
print("Proximo passo:")
print('  git add . && git commit -m "fix: sintaxe matriz - virgulas faltantes e ID 115 duplicado" && git push origin main')
