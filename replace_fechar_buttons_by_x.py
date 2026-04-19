"""
replace_fechar_buttons_by_x.py

Substitui os botões 'Fechar <Nome>' no final das páginas expansíveis
(Filosofia, Sobre, Afiliados) e do modal Contato por um segundo X
circular vinho idêntico ao que fica no topo.

Resultado: design mais limpo, padrão visual consistente (dois círculos
vinho simétricos no topo e na base), sem redundância textual.
"""

from pathlib import Path
import sys

ARQ = Path("src/components/LandingPage.jsx")

if not ARQ.exists():
    print(f"❌ Arquivo não encontrado: {ARQ.resolve()}")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# Template do botão X circular na base (centro horizontal, margem superior)
def make_x_button_base(aria_label: str, on_click: str) -> str:
    """Gera o JSX do botão X na base de uma seção/modal."""
    return f'''          {{/* Botão X fechar na base (segundo ponto de saída) */}}
          <div style={{{{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}}}>
            <button
              onClick={{() => {{ {on_click} }}}}
              aria-label="{aria_label}"
              style={{{{
                width: 36, height: 36, borderRadius: '50%',
                background: 'var(--wine)', color: 'white',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', fontWeight: 700,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                transition: 'all 0.2s', fontFamily: 'inherit',
              }}}}
              onMouseEnter={{(e) => {{ e.currentTarget.style.background = 'var(--cherry)'; e.currentTarget.style.transform = 'scale(1.1)' }}}}
              onMouseLeave={{(e) => {{ e.currentTarget.style.background = 'var(--wine)'; e.currentTarget.style.transform = 'scale(1)' }}}}
            >
              ✕
            </button>
          </div>'''

# Versão interna ao modal Contato (indentação diferente)
X_BUTTON_MODAL = '''            {/* Botão X fechar na base do modal */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
              <button
                onClick={() => setShowContato(false)}
                aria-label="Fechar Contato"
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--wine)', color: 'white',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem', fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s', fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cherry)'; e.currentTarget.style.transform = 'scale(1.1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--wine)'; e.currentTarget.style.transform = 'scale(1)' }}
              >
                ✕
              </button>
            </div>'''

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 1 — Filosofia: remove botão "Fechar Filosofia" e coloca X
# ─────────────────────────────────────────────────────────────────────
ancora_filosofia = '''          {/* Botão Fechar ao final da seção */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => { setShowFilosofia(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            >
              Fechar Filosofia
            </button>
          </div>'''

novo_filosofia = make_x_button_base(
    "Fechar Filosofia",
    "setShowFilosofia(false); window.scrollTo({ top: 0, behavior: 'smooth' })"
)

if ancora_filosofia in src:
    src = src.replace(ancora_filosofia, novo_filosofia, 1)
    print("✅ Alteração 1: botão 'Fechar Filosofia' substituído por X circular.")
elif 'aria-label="Fechar Filosofia"' in src and 'Fechar Filosofia\n' not in src:
    print("⚠️  Filosofia já ajustada. Pulando alteração 1.")
else:
    print("❌ Âncora 1 não encontrada (botão Fechar Filosofia).")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 2 — Sobre: remove botão "Fechar Sobre" e coloca X
# ─────────────────────────────────────────────────────────────────────
ancora_sobre = '''          {/* Botão Fechar ao final da seção */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => { setShowSobre(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            >
              Fechar Sobre
            </button>
          </div>'''

novo_sobre = make_x_button_base(
    "Fechar Sobre",
    "setShowSobre(false); window.scrollTo({ top: 0, behavior: 'smooth' })"
)

if ancora_sobre in src:
    src = src.replace(ancora_sobre, novo_sobre, 1)
    print("✅ Alteração 2: botão 'Fechar Sobre' substituído por X circular.")
elif 'aria-label="Fechar Sobre"' in src and 'Fechar Sobre\n' not in src:
    print("⚠️  Sobre já ajustado. Pulando alteração 2.")
else:
    print("❌ Âncora 2 não encontrada (botão Fechar Sobre).")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 3 — Afiliados: remove botão "Fechar Afiliados" e coloca X
# ─────────────────────────────────────────────────────────────────────
ancora_afiliados = '''          {/* Botão Fechar ao final da seção */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => { setShowAfiliados(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            >
              Fechar Afiliados
            </button>
          </div>'''

novo_afiliados = make_x_button_base(
    "Fechar Afiliados",
    "setShowAfiliados(false); window.scrollTo({ top: 0, behavior: 'smooth' })"
)

if ancora_afiliados in src:
    src = src.replace(ancora_afiliados, novo_afiliados, 1)
    print("✅ Alteração 3: botão 'Fechar Afiliados' substituído por X circular.")
elif 'aria-label="Fechar Afiliados"' in src and 'Fechar Afiliados\n' not in src:
    print("⚠️  Afiliados já ajustado. Pulando alteração 3.")
else:
    print("❌ Âncora 3 não encontrada (botão Fechar Afiliados).")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 4 — Modal Contato: remove "Fechar" e coloca X
# O botão no modal Contato tem estrutura diferente (className="btn btn-secondary")
# ─────────────────────────────────────────────────────────────────────
ancora_contato = '''            {/* Botão Fechar */}
            <button
              className="btn btn-secondary"
              onClick={() => setShowContato(false)}
              style={{ width: '100%', minWidth: 'auto', height: 50 }}
            >
              Fechar
            </button>'''

if ancora_contato in src:
    src = src.replace(ancora_contato, X_BUTTON_MODAL, 1)
    print("✅ Alteração 4: botão 'Fechar' do modal Contato substituído por X circular.")
elif 'aria-label="Fechar Contato"' in src.split("MODAL CONTATO")[1] if "MODAL CONTATO" in src else False:
    print("⚠️  Modal Contato já ajustado. Pulando alteração 4.")
else:
    print("❌ Âncora 4 não encontrada (botão Fechar do modal Contato).")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────
ARQ.write_text(src, encoding="utf-8")
print(f"\n🎉 Arquivo salvo: {ARQ.resolve()}")
print("\nPróximos passos:")
print("  git add . && git commit -m \"style: unifica X circular vinho na base em vez de botão Fechar\" && git push origin main")
