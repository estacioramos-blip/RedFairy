"""
fix_achado_9_ev_im.py

Ajuste terminologico no Achado 9 (Hemocromatose / Siderose):
  - 'FERRO ENDOVENOSO' -> 'FERRO EV/IM' (label)
  - 'usou FERRO ENDOVENOSO' -> 'usou FERRO ENDOVENOSO OU INTRAMUSCULAR'
  (razao: ferro IM dextrano ainda e usado; ambos bypassam hepcidina)
"""

from pathlib import Path
import sys

ARQ = Path("src/engine/achadosParalelos.js")
if not ARQ.exists():
    print(f"ERRO: {ARQ} nao existe."); sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# Troca 1: label da siderose iatrogenica
# ═════════════════════════════════════════════════════════════════════
antigo_1 = "? `SIDEROSE IATROGÊNICA POR FERRO ENDOVENOSO (Hb ${hemoglobina}"
novo_1   = "? `SIDEROSE IATROGÊNICA POR FERRO EV/IM (Hb ${hemoglobina}"

if "SIDEROSE IATROGÊNICA POR FERRO EV/IM" in src:
    print("AVISO 1: label ja ajustado.")
elif antigo_1 in src:
    src = src.replace(antigo_1, novo_1, 1)
    print("OK 1: label trocado para 'SIDEROSE IATROGENICA POR FERRO EV/IM'.")
else:
    print("ERRO 1: ancora do label nao encontrada.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
# Troca 2: texto sobre historia de uso
# ═════════════════════════════════════════════════════════════════════
antigo_2 = "em paciente que usou FERRO ENDOVENOSO recentemente."
novo_2   = "em paciente que usou FERRO ENDOVENOSO OU INTRAMUSCULAR recentemente."

if "FERRO ENDOVENOSO OU INTRAMUSCULAR recentemente" in src:
    print("AVISO 2: texto 'usou FERRO...' ja ajustado.")
elif antigo_2 in src:
    src = src.replace(antigo_2, novo_2, 1)
    print("OK 2: texto do historico de uso ampliado para EV + IM.")
else:
    print("ERRO 2: ancora do texto 'usou FERRO ENDOVENOSO recentemente' nao encontrada.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
# Troca 3: ferro parenteral bypassa hepcidina
# ═════════════════════════════════════════════════════════════════════
antigo_3 = "o ferro parenteral bypassa a regulação fisiológica pela hepcidina"
novo_3   = "o ferro parenteral (EV ou IM) bypassa a regulação fisiológica pela hepcidina"

if "o ferro parenteral (EV ou IM) bypassa" in src:
    print("AVISO 3: frase sobre hepcidina ja ajustada.")
elif antigo_3 in src:
    src = src.replace(antigo_3, novo_3, 1)
    print("OK 3: frase sobre hepcidina agora menciona EV ou IM.")
else:
    print("AVISO 3: ancora 'ferro parenteral bypassa hepcidina' nao encontrada (talvez ja foi alterada).")

ARQ.write_text(src, encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("AJUSTE TERMINOLOGICO APLICADO!")
print("=" * 60)
print()
print("Antes: 'SIDEROSE IATROGENICA POR FERRO ENDOVENOSO'")
print("Agora: 'SIDEROSE IATROGENICA POR FERRO EV/IM'")
print()
print("Antes: 'usou FERRO ENDOVENOSO recentemente'")
print("Agora: 'usou FERRO ENDOVENOSO OU INTRAMUSCULAR recentemente'")
print()
print("Razao clinica: ferro IM dextrano ainda e usado em alguns contextos,")
print("e ambas vias parenterais bypassam a regulacao da hepcidina.")
print()
print("Proximo passo:")
print('  git add . && git commit -m "fix: terminologia EV/IM no Achado 9" && git push origin main')
