"""
add_sobre_afiliados.py

Adiciona duas novas "páginas" (seções expansíveis) ao LandingPage.jsx:
  - Sobre
  - Afiliados

Seguem exatamente o padrão da seção FILOSOFIA:
  - state booleano controla exibição
  - link no nav (desktop + mobile) abre a seção
  - X no canto superior direito + botão "Fechar" no final
  - scroll suave de volta ao topo ao fechar

Estrutura das alterações:
  1. Adiciona useState para showSobre e showAfiliados
  2. Injeta os dois links no nav (após "Filosofia")
  3. Injeta as duas <section>s após a seção FILOSOFIA, antes de INDICAÇÕES
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
# ALTERAÇÃO 1 — Adicionar useState para showSobre e showAfiliados
# ─────────────────────────────────────────────────────────────────────
ancora_1 = "  const [showFilosofia, setShowFilosofia] = useState(false)"
novo_1 = (
    "  const [showFilosofia, setShowFilosofia] = useState(false)\n"
    "  const [showSobre, setShowSobre] = useState(false)\n"
    "  const [showAfiliados, setShowAfiliados] = useState(false)"
)

if ancora_1 not in src:
    print("❌ Âncora 1 não encontrada (useState showFilosofia).")
    sys.exit(1)

if "showSobre" in src and "showAfiliados" in src:
    print("⚠️  States showSobre/showAfiliados já existem. Pulando alteração 1.")
else:
    src = src.replace(ancora_1, novo_1, 1)
    print("✅ Alteração 1: states showSobre e showAfiliados adicionados.")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 2 — Adicionar links no nav
# ─────────────────────────────────────────────────────────────────────
ancora_2 = (
    '<a href="#filosofia" onClick={() => { setShowFilosofia(true); setNavOpen(false) }}>Filosofia</a>\n'
    '          <a href="#como-funciona" onClick={() => setNavOpen(false)}>Como funciona</a>'
)
novo_2 = (
    '<a href="#filosofia" onClick={() => { setShowFilosofia(true); setNavOpen(false) }}>Filosofia</a>\n'
    '          <a href="#sobre" onClick={() => { setShowSobre(true); setNavOpen(false) }}>Sobre</a>\n'
    '          <a href="#afiliados" onClick={() => { setShowAfiliados(true); setNavOpen(false) }}>Afiliados</a>\n'
    '          <a href="#como-funciona" onClick={() => setNavOpen(false)}>Como funciona</a>'
)

if ancora_2 not in src:
    print("❌ Âncora 2 não encontrada (links do nav).")
    sys.exit(1)

if '#sobre' in src and '#afiliados' in src:
    print("⚠️  Links 'Sobre' e 'Afiliados' já existem no nav. Pulando alteração 2.")
else:
    src = src.replace(ancora_2, novo_2, 1)
    print("✅ Alteração 2: links 'Sobre' e 'Afiliados' adicionados ao nav.")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 3 — Injetar as duas novas seções após FILOSOFIA
# A âncora é o comentário {/* INDICAÇÕES */}
# Elas ficam ENTRE o fim da filosofia e o início das indicações.
# ─────────────────────────────────────────────────────────────────────
ancora_3 = '{/* INDICAÇÕES */}\n      <section id="indicacoes">'

novo_3 = '''{/* SOBRE */}
      <section className="filosofia" id="sobre" style={{ display: showSobre ? 'block' : 'none', position: 'relative' }}>
        <div className="container">
          {/* Botão X fechar no canto superior direito */}
          <button
            onClick={() => { setShowSobre(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            aria-label="Fechar Sobre"
            style={{
              position: 'absolute', top: '1rem', right: '1.5rem',
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--wine)', color: 'white',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'all 0.2s', zIndex: 10, fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cherry)'; e.currentTarget.style.transform = 'scale(1.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--wine)'; e.currentTarget.style.transform = 'scale(1)' }}
          >
            ✕
          </button>

          <div className="reveal">
            <span className="tag">Sobre</span>
            <h2 className="stitle">Sobre o RedFairy</h2>
          </div>

          {/* ===================================================================== */}
          {/* CONTEÚDO DA PÁGINA "SOBRE" — Dr. Ramos, cole/edite seu conteúdo aqui. */}
          {/* ===================================================================== */}
          <div className="reveal" style={{ marginTop: '1.5rem', maxWidth: 800, marginLeft: 'auto', marginRight: 'auto' }}>
            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.8, fontWeight: 600, textAlign: 'justify' }}>
              [Placeholder] Conteúdo da página "Sobre" virá aqui. Você pode descrever a história do RedFairy,
              a motivação do projeto, a equipe, missão, visão e valores. Esta seção segue o mesmo padrão visual
              da Filosofia — fundo cinza claro, tipografia consistente.
            </p>
          </div>
          {/* ===================================================================== */}

          {/* Botão Fechar ao final da seção */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => { setShowSobre(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            >
              Fechar Sobre
            </button>
          </div>
        </div>
      </section>

      {/* AFILIADOS */}
      <section className="filosofia" id="afiliados" style={{ display: showAfiliados ? 'block' : 'none', position: 'relative' }}>
        <div className="container">
          {/* Botão X fechar no canto superior direito */}
          <button
            onClick={() => { setShowAfiliados(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            aria-label="Fechar Afiliados"
            style={{
              position: 'absolute', top: '1rem', right: '1.5rem',
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--wine)', color: 'white',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'all 0.2s', zIndex: 10, fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cherry)'; e.currentTarget.style.transform = 'scale(1.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--wine)'; e.currentTarget.style.transform = 'scale(1)' }}
          >
            ✕
          </button>

          <div className="reveal">
            <span className="tag">Afiliados</span>
            <h2 className="stitle">Programa de Afiliados</h2>
          </div>

          {/* ========================================================================= */}
          {/* CONTEÚDO DA PÁGINA "AFILIADOS" — Dr. Ramos, cole/edite seu conteúdo aqui. */}
          {/* ========================================================================= */}
          <div className="reveal" style={{ marginTop: '1.5rem', maxWidth: 800, marginLeft: 'auto', marginRight: 'auto' }}>
            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.8, fontWeight: 600, textAlign: 'justify' }}>
              [Placeholder] Conteúdo da página "Afiliados" virá aqui. Você pode descrever as regras do Programa de
              Afiliados Patrocinado, como se inscrever, benefícios, requisitos (registro em conselho profissional),
              forma de pagamento (PIX, USDC), e exemplos de ganhos.
            </p>
          </div>
          {/* ========================================================================= */}

          {/* Botão Fechar ao final da seção */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => { setShowAfiliados(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            >
              Fechar Afiliados
            </button>
          </div>
        </div>
      </section>

      {/* INDICAÇÕES */}
      <section id="indicacoes">'''

if ancora_3 not in src:
    print("❌ Âncora 3 não encontrada (comentário INDICAÇÕES).")
    sys.exit(1)

if 'id="sobre"' in src and 'id="afiliados"' in src:
    print("⚠️  Seções 'sobre' e 'afiliados' já existem. Pulando alteração 3.")
else:
    src = src.replace(ancora_3, novo_3, 1)
    print("✅ Alteração 3: seções 'Sobre' e 'Afiliados' injetadas após FILOSOFIA.")

# ─────────────────────────────────────────────────────────────────────
ARQ.write_text(src, encoding="utf-8")
print(f"\n🎉 Arquivo salvo: {ARQ.resolve()}")
print("\nPróximos passos:")
print("  git add . && git commit -m \"feat: adiciona páginas Sobre e Afiliados no menu\" && git push origin main")
print("\nPara editar o conteúdo de cada página, abra src/components/LandingPage.jsx e procure por:")
print("  - 'CONTEÚDO DA PÁGINA \"SOBRE\"'")
print("  - 'CONTEÚDO DA PÁGINA \"AFILIADOS\"'")
