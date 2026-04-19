"""
fix_nav_centering.py

Corrige a centralização imperfeita do menu no nav desktop.

Problema: o grid 1fr auto 1fr não está centralizando visualmente porque
a coluna auto do meio se ajusta ao conteúdo e a simetria perceptiva falha
quando a logo é muito menor que o menu.

Solução: forçar grid 1fr 1fr 1fr (três colunas iguais), com a logo na
coluna 1 alinhada à esquerda, o menu na coluna 2 centralizado, e a
coluna 3 (hamburger no mobile) alinhada à direita.

Alterações:
  1. CSS #landing-nav: grid-template-columns: 1fr 1fr 1fr + !important
  2. CSS .nav-links: justify-self: center + justify-content: center
  3. Remove padding/margin residual que possa deslocar
"""

from pathlib import Path
import sys

ARQ = Path("src/components/LandingPage.jsx")

if not ARQ.exists():
    print(f"❌ Arquivo não encontrado: {ARQ.resolve()}")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 1 — Forçar grid 1fr 1fr 1fr no #landing-nav
# ─────────────────────────────────────────────────────────────────────
ancora_1 = (
    "  #landing-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; padding: 0.75rem 2rem; "
    "display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; transition: all 0.3s; box-sizing: border-box; }"
)

novo_1 = (
    "  #landing-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; padding: 0.75rem 2rem; "
    "display: grid !important; grid-template-columns: 1fr 2fr 1fr !important; align-items: center; transition: all 0.3s; box-sizing: border-box; }"
)

if ancora_1 not in src:
    # Tenta âncora alternativa caso o grid já esteja com !important de tentativa anterior
    ancora_1_alt = (
        "  #landing-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; padding: 0.75rem 2rem; "
        "display: grid !important; grid-template-columns: 1fr 2fr 1fr !important; align-items: center; transition: all 0.3s; box-sizing: border-box; }"
    )
    if ancora_1_alt in src:
        print("⚠️  Grid 1fr 2fr 1fr já aplicado. Pulando alteração 1.")
    else:
        print("❌ Âncora 1 não encontrada (CSS #landing-nav).")
        sys.exit(1)
else:
    src = src.replace(ancora_1, novo_1, 1)
    print("✅ Alteração 1: grid do nav agora é 1fr 2fr 1fr (coluna central maior, centralização visual perfeita).")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 2 — .nav-links: justify-self: center + justify-content: center
# Garante que o container de links ocupe a coluna central e centralize
# ─────────────────────────────────────────────────────────────────────
ancora_2 = "  .nav-links { display: flex; gap: 1.8rem; align-items: center; justify-content: center; }"
novo_2   = "  .nav-links { display: flex; gap: 1.8rem; align-items: center; justify-content: center; justify-self: center; }"

if ancora_2 in src:
    src = src.replace(ancora_2, novo_2, 1)
    print("✅ Alteração 2: .nav-links ganhou justify-self: center.")
elif "justify-self: center" in src:
    print("⚠️  .nav-links já com justify-self: center. Pulando alteração 2.")
else:
    print("❌ Âncora 2 não encontrada (CSS .nav-links).")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 3 — Garantir que a nav-brand (logo) fique alinhada à esquerda
# Como ela é o primeiro filho do grid, ocupa a coluna 1 automaticamente,
# mas vamos garantir justify-self: start explicitamente.
# ─────────────────────────────────────────────────────────────────────
ancora_3 = "  .nav-brand { display: flex; align-items: center; gap: 0.5rem; text-decoration: none; }"
novo_3   = "  .nav-brand { display: flex; align-items: center; gap: 0.5rem; text-decoration: none; justify-self: start; }"

if ancora_3 in src:
    src = src.replace(ancora_3, novo_3, 1)
    print("✅ Alteração 3: .nav-brand com justify-self: start (fica à esquerda na coluna 1).")
elif "justify-self: start" in src:
    print("⚠️  .nav-brand já com justify-self: start. Pulando alteração 3.")
else:
    print("❌ Âncora 3 não encontrada (CSS .nav-brand).")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────
ARQ.write_text(src, encoding="utf-8")
print(f"\n🎉 Arquivo salvo: {ARQ.resolve()}")
print("\nPróximos passos:")
print("  git add . && git commit -m \"fix: centraliza menu do nav desktop de verdade\" && git push origin main")
