"""
fix_filosofia_topo_branco.py

Corrige a faixa cinza deselegante no topo das páginas Filosofia/Sobre/Afiliados.

Problema: padding-top: 5rem faz parte da seção, que tem background cinza.
Resultado: faixa cinza no topo, sanduichada entre o nav branco e o conteúdo.

Solução: troca padding-top por margin-top. Margem é espaço transparente
fora da caixa, revelando o fundo branco da página por trás.

Alteração única no CSS da .filosofia:
  - padding-top: 5rem → margin-top: 5rem
  - padding-top original (1rem) volta, para respiro interno da caixa
"""

from pathlib import Path
import sys

ARQ = Path("src/components/LandingPage.jsx")

if not ARQ.exists():
    print(f"❌ Arquivo não encontrado: {ARQ.resolve()}")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO — Troca padding-top por margin-top na .filosofia
# Mantém um padding-top interno menor (1rem) para o conteúdo não
# encostar na borda superior da caixa cinza.
# ─────────────────────────────────────────────────────────────────────
ancora = "  .filosofia { background: var(--gray-bg); color: var(--text); position: relative; padding-top: 5rem; padding-bottom: 1.5rem; }"
novo   = "  .filosofia { background: var(--gray-bg); color: var(--text); position: relative; margin-top: 5rem; padding-top: 1.5rem; padding-bottom: 1.5rem; }"

if ancora not in src:
    if "margin-top: 5rem" in src.split(".filosofia {")[1].split("}")[0]:
        print("⚠️  .filosofia já ajustada com margin-top. Pulando.")
        sys.exit(0)
    print("❌ Âncora não encontrada (CSS .filosofia com padding-top: 5rem).")
    print("   Verifique se o script fix_nav_overlap_sections.py foi aplicado antes.")
    sys.exit(1)

src = src.replace(ancora, novo, 1)
print("✅ .filosofia: padding-top: 5rem → margin-top: 5rem.")
print("   Agora a faixa no topo é BRANCA (fundo da página), não mais cinza.")
print("   Padding-top interno de 1.5rem preservado para respiro do conteúdo.")

# ─────────────────────────────────────────────────────────────────────
ARQ.write_text(src, encoding="utf-8")
print(f"\n🎉 Arquivo salvo: {ARQ.resolve()}")
print("\nPróximos passos:")
print("  git add . && git commit -m \"fix: faixa branca em vez de cinza no topo de Filosofia/Sobre/Afiliados\" && git push origin main")
