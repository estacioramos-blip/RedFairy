"""
fix_filosofia_fechar.py

Adiciona botões de fechar (X no topo + botão Fechar no final) na seção FILOSOFIA
do LandingPage.jsx, já que hoje ela abre mas não fecha mais.

Duas alterações:
1. Logo após <div className="container"> da seção filosofia, injeta o botão X absoluto
2. Logo antes do </div></section> de fechamento da filosofia, injeta o botão "Fechar"
"""

from pathlib import Path
import sys

ARQ = Path("src/components/LandingPage.jsx")

if not ARQ.exists():
    print(f"❌ Arquivo não encontrado: {ARQ.resolve()}")
    print("   Rode este script a partir da raiz do projeto (C:\\Users\\Estacio\\Desktop\\redfairy).")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 1 — Injeta o botão X no canto superior direito
# ─────────────────────────────────────────────────────────────────────
ancora_1 = (
    '{/* FILOSOFIA */}\n'
    '      <section className="filosofia" id="filosofia" style={{ display: showFilosofia ? \'block\' : \'none\' }}>\n'
    '        <div className="container">'
)

novo_1 = (
    '{/* FILOSOFIA */}\n'
    '      <section className="filosofia" id="filosofia" style={{ display: showFilosofia ? \'block\' : \'none\', position: \'relative\' }}>\n'
    '        <div className="container">\n'
    '          {/* Botão X fechar no canto superior direito */}\n'
    '          <button\n'
    '            onClick={() => { setShowFilosofia(false); window.scrollTo({ top: 0, behavior: \'smooth\' }) }}\n'
    '            aria-label="Fechar Filosofia"\n'
    '            style={{\n'
    '              position: \'absolute\', top: \'1rem\', right: \'1.5rem\',\n'
    '              width: 36, height: 36, borderRadius: \'50%\',\n'
    '              background: \'var(--wine)\', color: \'white\',\n'
    '              border: \'none\', cursor: \'pointer\',\n'
    '              display: \'flex\', alignItems: \'center\', justifyContent: \'center\',\n'
    '              fontSize: \'1.1rem\', fontWeight: 700,\n'
    '              boxShadow: \'0 2px 8px rgba(0,0,0,0.15)\',\n'
    '              transition: \'all 0.2s\', zIndex: 10, fontFamily: \'inherit\',\n'
    '            }}\n'
    '            onMouseEnter={(e) => { e.currentTarget.style.background = \'var(--cherry)\'; e.currentTarget.style.transform = \'scale(1.1)\' }}\n'
    '            onMouseLeave={(e) => { e.currentTarget.style.background = \'var(--wine)\'; e.currentTarget.style.transform = \'scale(1)\' }}\n'
    '          >\n'
    '            ✕\n'
    '          </button>'
)

if ancora_1 not in src:
    print("❌ Âncora 1 não encontrada (abertura da seção filosofia). Nada alterado.")
    sys.exit(1)

if 'aria-label="Fechar Filosofia"' in src:
    print("⚠️  Botão X já existe no arquivo. Pulando alteração 1.")
else:
    src = src.replace(ancora_1, novo_1, 1)
    print("✅ Alteração 1: botão X no canto superior direito injetado.")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 2 — Injeta o botão "Fechar" no final da seção
# A âncora é o fechamento da .filosofia-grid + container + section
# ─────────────────────────────────────────────────────────────────────
ancora_2 = (
    '              </div>\n'
    '            </div>\n'
    '          </div>\n'
    '        </div>\n'
    '      </section>\n'
    '\n'
    '      {/* INDICAÇÕES */}'
)

novo_2 = (
    '              </div>\n'
    '            </div>\n'
    '          </div>\n'
    '\n'
    '          {/* Botão Fechar ao final da seção */}\n'
    '          <div style={{ display: \'flex\', justifyContent: \'center\', marginTop: \'2rem\' }}>\n'
    '            <button\n'
    '              className="btn btn-secondary"\n'
    '              onClick={() => { setShowFilosofia(false); window.scrollTo({ top: 0, behavior: \'smooth\' }) }}\n'
    '            >\n'
    '              Fechar Filosofia\n'
    '            </button>\n'
    '          </div>\n'
    '        </div>\n'
    '      </section>\n'
    '\n'
    '      {/* INDICAÇÕES */}'
)

if ancora_2 not in src:
    print("❌ Âncora 2 não encontrada (fechamento da seção filosofia antes de INDICAÇÕES).")
    print("   O script encontrou a abertura mas não o fechamento — verifique manualmente.")
    sys.exit(1)

if 'Fechar Filosofia\n' in src and '<button\n              className="btn btn-secondary"' in src:
    print("⚠️  Botão 'Fechar Filosofia' já existe no arquivo. Pulando alteração 2.")
else:
    src = src.replace(ancora_2, novo_2, 1)
    print("✅ Alteração 2: botão 'Fechar Filosofia' no final da seção injetado.")

# ─────────────────────────────────────────────────────────────────────
ARQ.write_text(src, encoding="utf-8")
print(f"\n🎉 Arquivo salvo: {ARQ.resolve()}")
print("\nPróximos passos:")
print("  git add . && git commit -m \"feat: adiciona botão fechar na seção Filosofia\" && git push origin main")
