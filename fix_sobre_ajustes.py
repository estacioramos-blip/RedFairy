"""
fix_sobre_ajustes.py

Três ajustes finais na página Sobre:

1. Título "Sobre o RedFairy" → "RedFairy | OBA", com tamanho reduzido
   (h2 padrão da classe .stitle é 2.3rem, vai para ~1.6rem)

2. Remove a .highlight-box vinho que envolvia "Explore. Entenda. Compartilhe."

3. "Explore. Entenda. Compartilhe." fica como texto em negrito,
   centralizado, sem fundo vinho.
"""

from pathlib import Path
import sys

ARQ = Path("src/components/LandingPage.jsx")

if not ARQ.exists():
    print(f"❌ Arquivo não encontrado: {ARQ.resolve()}")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 1 — Título: texto + tamanho
# Âncora: o h2 da página Sobre (procurando o contexto exato)
# ─────────────────────────────────────────────────────────────────────
ancora_1 = '''          <div className="reveal">
            <span className="tag">Sobre</span>
            <h2 className="stitle">Sobre o RedFairy</h2>
          </div>'''

novo_1 = '''          <div className="reveal">
            <span className="tag">Sobre</span>
            <h2 className="stitle" style={{ fontSize: '1.6rem' }}>RedFairy | OBA</h2>
          </div>'''

if ancora_1 not in src:
    if 'RedFairy | OBA' in src:
        print("⚠️  Título da página Sobre já ajustado. Pulando alteração 1.")
    else:
        print("❌ Âncora 1 não encontrada (título da página Sobre).")
        sys.exit(1)
else:
    src = src.replace(ancora_1, novo_1, 1)
    print("✅ Alteração 1: título agora é 'RedFairy | OBA' com 1.6rem.")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 2 — Trocar a highlight-box por um texto simples em negrito
# ─────────────────────────────────────────────────────────────────────
ancora_2 = '''            {/* Fecho institucional em destaque vinho */}
            <div className="highlight-box" style={{ textAlign: 'center', padding: '1.4rem 1.5rem', marginTop: '0.5rem' }}>
              <p style={{ color: 'white', fontSize: '1.15rem', fontWeight: 700, margin: 0, letterSpacing: '0.5px' }}>
                Explore. Entenda. Compartilhe.
              </p>
            </div>'''

novo_2 = '''            {/* Fecho institucional em negrito simples */}
            <p style={{ textAlign: 'center', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', margin: '0.5rem 0 0', letterSpacing: '0.5px' }}>
              Explore. Entenda. Compartilhe.
            </p>'''

if ancora_2 not in src:
    if 'Fecho institucional em negrito simples' in src:
        print("⚠️  Fecho já ajustado. Pulando alteração 2.")
    else:
        print("❌ Âncora 2 não encontrada (highlight-box do fecho).")
        sys.exit(1)
else:
    src = src.replace(ancora_2, novo_2, 1)
    print("✅ Alteração 2: highlight-box removida, texto em negrito simples centralizado.")

# ─────────────────────────────────────────────────────────────────────
ARQ.write_text(src, encoding="utf-8")
print(f"\n🎉 Arquivo salvo: {ARQ.resolve()}")
print("\nPróximos passos:")
print("  git add . && git commit -m \"style: ajustes finais na página Sobre\" && git push origin main")
