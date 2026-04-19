"""
style_nav_links.py

Ajusta a tipografia dos links do menu (.nav-links a) para dar mais destaque visual:
  - font-size: 0.87rem → 0.95rem
  - color: var(--text-sec) → var(--wine)
  - font-weight: 500 → 600
  - hover: var(--text) → var(--cherry)
"""

from pathlib import Path
import sys

ARQ = Path("src/components/LandingPage.jsx")

if not ARQ.exists():
    print(f"❌ Arquivo não encontrado: {ARQ.resolve()}")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 1 — Estilo base dos links do nav
# ─────────────────────────────────────────────────────────────────────
ancora_1 = "  .nav-links a { text-decoration: none; font-size: 0.87rem; font-weight: 500; color: var(--text-sec); transition: color 0.2s; }"
novo_1   = "  .nav-links a { text-decoration: none; font-size: 0.95rem; font-weight: 600; color: var(--wine); transition: color 0.2s; }"

if ancora_1 not in src:
    # Caso já esteja ajustado
    if "font-size: 0.95rem; font-weight: 600; color: var(--wine)" in src:
        print("⚠️  Links do nav já estilizados. Pulando alteração 1.")
    else:
        print("❌ Âncora 1 não encontrada (CSS .nav-links a).")
        sys.exit(1)
else:
    src = src.replace(ancora_1, novo_1, 1)
    print("✅ Alteração 1: links do nav agora com 0.95rem, peso 600, cor vinho.")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 2 — Hover dos links
# ─────────────────────────────────────────────────────────────────────
ancora_2 = "  .nav-links a:hover { color: var(--text); }"
novo_2   = "  .nav-links a:hover { color: var(--cherry); }"

if ancora_2 not in src:
    if "a:hover { color: var(--cherry); }" in src:
        print("⚠️  Hover já ajustado. Pulando alteração 2.")
    else:
        print("❌ Âncora 2 não encontrada (CSS .nav-links a:hover).")
        sys.exit(1)
else:
    src = src.replace(ancora_2, novo_2, 1)
    print("✅ Alteração 2: hover dos links agora fica vermelho cherry.")

# ─────────────────────────────────────────────────────────────────────
ARQ.write_text(src, encoding="utf-8")
print(f"\n🎉 Arquivo salvo: {ARQ.resolve()}")
print("\nPróximos passos:")
print("  git add . && git commit -m \"style: aumenta fonte e cor dos links do nav\" && git push origin main")
