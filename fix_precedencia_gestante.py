"""
fix_precedencia_gestante.py

Bug: gestante com Hb 11.7 + labs normais foi diagnosticada como
'ANEMIA LEVE NORMOCITICA SEM SIDEROPENIA' em vez de
'GESTANTE SAUDAVEL' (ID 110).

Causa: a entrada generica casa primeiro porque aparece antes no
array (matrix.find() para na primeira correspondencia).

Solucao: mover as 5 entradas gestacionais (IDs 110-114) para o
inicio do array, ANTES de qualquer entrada generica. Como tem
'gestante: true', so casam em gestantes; nao-gestantes pulam e
caem nas entradas genericas normalmente.
"""

from pathlib import Path
import re
import sys

FEM = Path("src/engine/femaleMatrix.js")
if not FEM.exists():
    print(f"ERRO: {FEM} nao existe.")
    sys.exit(1)

src = FEM.read_text(encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# 1. Extrair as 5 entradas gestacionais (IDs 110-114) do final do array
# ═════════════════════════════════════════════════════════════════════

# Regex que captura desde o comentario "// ─── ID 110" ate o final do objeto (fechando com '},')
# incluindo o comentario de cada uma.
# Estrategia: capturar bloco grande de "// ─── ID 110" ate o "  }," que vem antes de "// ─── ID 111"
# e repetir para 111, 112, 113, 114 (ultimo vai ate o final, antes do ']').

def extrair_entrada(src, id_num, proximo_marcador=None):
    """
    Extrai bloco da entrada com ID `id_num`.
    Retorna: (bloco_completo_com_comentario, posicao_inicio, posicao_fim)
    """
    marcador_inicio = f"// ─── ID {id_num}"
    idx_ini = src.find(marcador_inicio)
    if idx_ini < 0:
        return None, None, None

    # Achar onde o objeto termina:
    # - Se tem proximo marcador: termina antes dele
    # - Se nao: termina antes do '];' final do array
    if proximo_marcador:
        idx_fim = src.find(f"// ─── ID {proximo_marcador}", idx_ini)
    else:
        # ultima entrada: termina antes do ']'
        idx_fim = src.find("];", idx_ini)
        # Mas precisamos achar o fim do objeto antes do ] — o '},' mais proximo do ]
        # Busca reverso a partir do ]:
        idx_fim = src.rfind("},", idx_ini, idx_fim) + len("},") + 1  # +1 para incluir \n

    if idx_fim < 0:
        return None, None, None

    return src[idx_ini:idx_fim], idx_ini, idx_fim


# Extrair as 5 entradas em ordem
entradas_extraidas = []
proximos = [111, 112, 113, 114, None]
posicoes = []

for i, id_num in enumerate([110, 111, 112, 113, 114]):
    prox = proximos[i]
    bloco, ini, fim = extrair_entrada(src, id_num, prox)
    if bloco is None:
        print(f"ERRO: entrada ID {id_num} nao encontrada.")
        sys.exit(1)
    entradas_extraidas.append(bloco)
    posicoes.append((ini, fim))

print(f"Encontradas {len(entradas_extraidas)} entradas gestacionais para mover.")

# ═════════════════════════════════════════════════════════════════════
# 2. Remover as 5 entradas do final (de tras pra frente para nao bagunçar indices)
# ═════════════════════════════════════════════════════════════════════
for ini, fim in reversed(posicoes):
    src = src[:ini] + src[fim:]

print("Entradas antigas removidas do final do array.")

# ═════════════════════════════════════════════════════════════════════
# 3. Inserir as 5 entradas no inicio (logo apos 'export const femaleMatrix = [')
# ═════════════════════════════════════════════════════════════════════
ancora_inicio = "export const femaleMatrix = ["
idx_inicio = src.find(ancora_inicio)
if idx_inicio < 0:
    print("ERRO: inicio do array nao encontrado.")
    sys.exit(1)

# Inserir logo apos a '[' + quebra de linha
idx_inserir = idx_inicio + len(ancora_inicio) + 1  # +1 pra \n

cabecalho = """
  // ════════════════════════════════════════════════════════════════════════
  //  BLOCO GESTACIONAL — avaliado PRIMEIRO para ter precedencia sobre
  //  entradas genericas. IDs 110-114 so casam se inputs.gestante === true.
  //  Ordem: SAUDAVEL -> SIDEROPENIA -> LEVE -> MODERADA -> GRAVE
  // ════════════════════════════════════════════════════════════════════════
"""

bloco_gestacional = cabecalho + "".join(entradas_extraidas) + "\n"

# Verificar se ja foi movido antes
if "BLOCO GESTACIONAL" in src[:500]:
    print("AVISO: bloco gestacional ja esta no inicio.")
else:
    src = src[:idx_inserir] + bloco_gestacional + src[idx_inserir:]
    print("OK: entradas gestacionais movidas para o inicio do array.")

FEM.write_text(src, encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("FIX APLICADO!")
print("=" * 60)
print(f"Arquivo: {FEM}")
print()
print("MUDANCA:")
print("  Antes: entradas genericas (IDs 3, 4...) vinham antes, casavam")
print("         primeiro mesmo em gestantes, dando diagnosticos errados.")
print("  Agora: IDs 110-114 (gestacionais) estao no topo do array.")
print("         Gestantes casam nelas primeiro.")
print("         Nao-gestantes pulam (gestante:true nao casa com false)")
print("         e caem nas genericas normalmente.")
print()
print("Teste de regressao sugerido:")
print("  1. Gestante Hb 11.7 + labs normais    -> ID 110 SAUDAVEL (verde)")
print("  2. Nao gestante Hb 11.7 + labs normais -> ANEMIA LEVE (laranja/amarelo)")
print()
print("Proximo passo:")
print('  git add . && git commit -m "fix: entradas gestacionais com precedencia no match" && git push origin main')
