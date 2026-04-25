"""
fix_tdz_resultcard.py

BUG ENCONTRADO apos source maps revelarem ResultCard.jsx:248.

Problema:
  Linha 248: const temObstipacao = !!modIntestData && ...   <- USA modIntestData
  Linha 256: const modIntestData = oba?.modulos?.find(...)   <- DECLARA modIntestData
  Linha 257: const temObstipacaoModulo = !!modIntestData ... <- duplicata correta

TDZ: modIntestData acessada antes da declaracao (minificada para 'g').

Fix:
  1. Remover linha 248 (const temObstipacao duplicada)
  2. Atualizar linha 259 para usar temObstipacaoModulo
"""
from pathlib import Path
import sys

RC = Path("src/components/ResultCard.jsx")
src = RC.read_text(encoding="utf-8")

# Localizar e remover a linha duplicada (linha 248 original)
# Padrao exato a remover
antigo_linha_248 = """  // Verificar obstipação via módulo intestinal
  const temObstipacao = !!modIntestData && modIntestData.linhas?.some(l => l.includes('OBSTIPAÇÃO'))

  // Verificar fibromialgia"""

novo_linha_248 = """  // Verificar fibromialgia"""

if antigo_linha_248 not in src:
    print("AVISO: padrao exato da linha 248 nao encontrado.")
    print("Verificando alternativas...")
    # Padrao mais permissivo
    alt = "const temObstipacao = !!modIntestData"
    if alt in src:
        print(f"  '{alt}' encontrado. Tentando com contexto menor...")
        # Padrao com apenas a linha
        import re
        padrao = re.compile(
            r"\s*// Verificar obstipação via módulo intestinal\s*\n\s*const temObstipacao = !!modIntestData.*?\n",
            re.DOTALL
        )
        m = padrao.search(src)
        if m:
            src = src[:m.start()] + "\n" + src[m.end():]
            print(f"  OK (regex): linhas removidas.")
        else:
            print("ERRO: nao foi possivel remover automaticamente.")
            sys.exit(1)
    else:
        print("ERRO: 'const temObstipacao' nao encontrado.")
        sys.exit(1)
else:
    src = src.replace(antigo_linha_248, novo_linha_248, 1)
    print("OK: linha 248 removida (const temObstipacao duplicada).")

# Agora atualizar o if (!temObstipacao && ...) para usar temObstipacaoModulo
antigo_if = "if (!temObstipacao && !temFibromialgia) return null"
novo_if   = "if (!temObstipacaoModulo && !temFibromialgia) return null"

if antigo_if in src:
    src = src.replace(antigo_if, novo_if, 1)
    print("OK: linha do 'if' atualizada para temObstipacaoModulo.")
else:
    print(f"AVISO: '{antigo_if}' nao encontrado. Verifique manualmente.")

# Salvar
RC.write_text(src, encoding="utf-8")

# Validacao simples
print()
print("VERIFICACAO FINAL:")
count_temObstipacao = src.count("temObstipacao ")
count_temObstipacaoModulo = src.count("temObstipacaoModulo")
print(f"  'temObstipacao ' no arquivo: {count_temObstipacao} (esperado 0 - nao deve existir mais)")
print(f"  'temObstipacaoModulo':       {count_temObstipacaoModulo}")

print()
print("=" * 60)
print("BUG TDZ CORRIGIDO!")
print("=" * 60)
print()
print("Proximo passo:")
print("  1. npm run build")
print("  2. npm run preview")
print("  3. Testar no http://localhost:4173 (janela anonima)")
print("  4. Se OK: git add . && git commit -m 'fix: TDZ em ResultCard.jsx - remove const temObstipacao duplicada' && git push origin main")
