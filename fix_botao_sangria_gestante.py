"""
fix_botao_sangria_gestante.py

Fix: remover botao 'Protocolo de Sangria Terapeutica' quando a
paciente e gestante. Atualmente o botao aparece em gestantes com
sobrecarga porque o gatilho TEXTUAL ainda dispara (texto menciona
'sangrias terapeuticas').

Logica correta:
  - Gestante: NUNCA mostra botao (sangria contraindicada)
             + Mostra banner rosa com orientacao pos-parto
  - Nao-gestante: comportamento atual mantido
"""

from pathlib import Path
import sys

ARQ = Path("src/components/ResultCard.jsx")
if not ARQ.exists():
    print(f"ERRO: {ARQ} nao existe.")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# Ancora: a linha que define precisaSangria combinando textual + clinico
ancora = "  const precisaSangria = _precisaSangriaTextual || _sobrecargaMasc || (_sobrecargaFem && !_gestante);"
novo   = "  const precisaSangria = (_precisaSangriaTextual || _sobrecargaMasc || (_sobrecargaFem && !_gestante)) && !_gestante;"

if "_precisaSangriaTextual || _sobrecargaMasc || (_sobrecargaFem && !_gestante)) && !_gestante" in src:
    print("AVISO: fix ja aplicado.")
    sys.exit(0)

if ancora in src:
    src = src.replace(ancora, novo, 1)
    ARQ.write_text(src, encoding="utf-8")
    print("OK: botao de sangria agora NUNCA aparece em gestantes.")
else:
    print("ERRO: ancora do precisaSangria nao encontrada.")
    print("     Verifique se o fix anterior (criterio clinico) foi aplicado.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("FIX APLICADO!")
print("=" * 60)
print()
print("LOGICA FINAL:")
print("  Gestante + sobrecarga    -> SO banner rosa (sem botao)")
print("  Nao-gestante + sobrecarga -> botao de sangria")
print("  Outros casos nao afetados")
print()
print("Teste:")
print("  F 30a gestante, Hb 12.5, Ferr 500, Sat 55")
print("  -> Banner rosa APARECE, botao de sangria NAO aparece")
print()
print("Proximo passo:")
print('  git add . && git commit -m "fix: remove botao sangria em gestante" && git push origin main')
