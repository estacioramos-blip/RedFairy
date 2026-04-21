"""
fix_matcher_gestante_hiperm.py

Bug: paciente NAO gestante com Hb 12.1, ferritina baixa, sat baixa
foi classificada como 'GESTANTE COM SIDEROPENIA INCIPIENTE'.

Causa raiz: matchesConditions() em decisionEngine.js NAO verifica
a flag 'gestante' (nem 'hipermenorreia'). Entradas matriciais com
essas flags casam em qualquer paciente, ignorando o filtro.

Fix: adicionar 2 linhas seguindo o mesmo padrao das outras flags
(bariatrica, vegetariano, perda, alcoolista, transfundido).
"""

from pathlib import Path
import sys

ARQ = Path("src/engine/decisionEngine.js")
if not ARQ.exists():
    print(f"ERRO: {ARQ} nao existe.")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# Fix — adicionar verificacoes de gestante e hipermenorreia
# ═════════════════════════════════════════════════════════════════════
ancora = """  if (c.bariatrica   !== undefined && (inputs.bariatrica   ?? false) !== c.bariatrica)   return false;
  if (c.vegetariano  !== undefined && (inputs.vegetariano  ?? false) !== c.vegetariano)  return false;
  if (c.perda        !== undefined && (inputs.perda        ?? false) !== c.perda)        return false;
  if (c.alcoolista   !== undefined && (inputs.alcoolista   ?? false) !== c.alcoolista)   return false;
  if (c.transfundido !== undefined && (inputs.transfundido ?? false) !== c.transfundido) return false;"""

novo = """  if (c.bariatrica     !== undefined && (inputs.bariatrica     ?? false) !== c.bariatrica)     return false;
  if (c.vegetariano    !== undefined && (inputs.vegetariano    ?? false) !== c.vegetariano)    return false;
  if (c.perda          !== undefined && (inputs.perda          ?? false) !== c.perda)          return false;
  if (c.alcoolista     !== undefined && (inputs.alcoolista     ?? false) !== c.alcoolista)     return false;
  if (c.transfundido   !== undefined && (inputs.transfundido   ?? false) !== c.transfundido)   return false;
  if (c.gestante       !== undefined && (inputs.gestante       ?? false) !== c.gestante)       return false;
  if (c.hipermenorreia !== undefined && (inputs.hipermenorreia ?? false) !== c.hipermenorreia) return false;"""

if "c.gestante" in src:
    print("AVISO: flag gestante ja e verificada no matcher.")
elif ancora in src:
    src = src.replace(ancora, novo, 1)
    ARQ.write_text(src, encoding="utf-8")
    print("OK: matchesConditions agora verifica gestante E hipermenorreia.")
else:
    print("ERRO: ancora do bloco de flags nao encontrada.")
    print("     Verifique se o arquivo foi modificado desde a ultima analise.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("FIX APLICADO!")
print("=" * 60)
print(f"Arquivo: {ARQ}")
print()
print("ANTES:")
print("  matcher so verificava: bariatrica, vegetariano, perda,")
print("  alcoolista, transfundido. 'gestante' e 'hipermenorreia'")
print("  eram IGNORADOS — entradas com gestante:true casavam em")
print("  qualquer paciente (bug!).")
print()
print("AGORA:")
print("  matcher verifica TODAS as flags usadas nas matrizes:")
print("  bariatrica, vegetariano, perda, alcoolista, transfundido,")
print("  + gestante + hipermenorreia.")
print()
print("Teste de regressao:")
print("  1. NAO gestante, Hb 12.1, Ferr baixa -> SIDEROPENIA INCIPIENTE (amarelo)")
print("     (NAO deve casar em ID 111 GESTANTE)")
print("  2. Gestante, Hb 11.8, labs normais   -> GESTANTE SAUDAVEL (verde, ID 110)")
print("  3. Gestante, Hb 11.5, Ferr baixa     -> GESTANTE SIDEROPENIA (amarelo, ID 111)")
print()
print("Proximo passo:")
print('  git add . && git commit -m "fix: matcher agora verifica gestante e hipermenorreia" && git push origin main')
