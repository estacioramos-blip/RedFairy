"""
fix_p1_2_semespecialista_duplicado.py

Bug P1.2 (cosmetico): 'semEspecialista: false' aparece duas vezes
no state inicial do form, na linha 221:

    ganhou_peso_apos: false, fez_plasma_argonio: false, semEspecialista: false, semEspecialista: false,

JavaScript aceita chaves duplicadas e usa a ultima, mas e ruido que
pode confundir manutencao futura. Fix: remover uma das duas.
"""

from pathlib import Path
import sys

ARQ = Path("src/components/OBAModal.jsx")
if not ARQ.exists():
    print(f"ERRO: {ARQ} nao existe.")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

antigo = "ganhou_peso_apos: false, fez_plasma_argonio: false, semEspecialista: false, semEspecialista: false,"
novo   = "ganhou_peso_apos: false, fez_plasma_argonio: false, semEspecialista: false,"

if novo in src and antigo not in src:
    print("AVISO: duplicacao ja foi removida anteriormente.")
    sys.exit(0)

if antigo in src:
    src = src.replace(antigo, novo, 1)
    ARQ.write_text(src, encoding="utf-8")
    print("OK: duplicacao de 'semEspecialista: false' removida.")
else:
    print("ERRO: linha com duplicacao nao encontrada.")
    print("     Verifique se o codigo foi modificado desde a analise.")
    sys.exit(1)

# Sanidade: checar quantas vezes 'semEspecialista:' aparece no arquivo agora
count = src.count("semEspecialista:")
print(f"\n  Total de ocorrencias de 'semEspecialista:' no arquivo: {count}")
print("  (se > 1, pode haver outra definicao em outro state — verificar manualmente)")

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("FIX P1.2 APLICADO!")
print("=" * 60)
print()
print("State do form limpo. Campo 'semEspecialista' mantido com seu valor")
print("inicial false, mas agora sem duplicacao.")
print()
print("Proximo passo:")
print('  git add . && git commit -m "fix P1.2: remove semEspecialista duplicado no state" && git push origin main')
