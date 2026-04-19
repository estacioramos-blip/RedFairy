"""
add_afiliados_content.py

Substitui o placeholder da página Afiliados pelo texto institucional real.

Diagramação (seguindo o padrão visual da página Sobre):
  - Título h2 reduzido (1.6rem) — "Programa de Afiliados"
  - Parágrafos em prose limpa, justificada, max-width 760px
  - Destaques em wine: RedFairy | OBA, médicos e outros profissionais de saúde
  - Fecho "Quer participar? Entre em contato. Será um prazer acolher seu apoio."
    em negrito simples centralizado
  - "Entre em contato" é LINK CLICÁVEL que abre o modal Contato

Duas alterações:
  1. Ajusta o título para "Programa de Afiliados" com fontSize 1.6rem
  2. Substitui o placeholder pelo conteúdo real diagramado
"""

from pathlib import Path
import sys

ARQ = Path("src/components/LandingPage.jsx")

if not ARQ.exists():
    print(f"❌ Arquivo não encontrado: {ARQ.resolve()}")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 1 — Ajustar título da página Afiliados (reduzir + manter texto)
# ─────────────────────────────────────────────────────────────────────
ancora_1 = '''          <div className="reveal">
            <span className="tag">Afiliados</span>
            <h2 className="stitle">Programa de Afiliados</h2>
          </div>'''

novo_1 = '''          <div className="reveal">
            <span className="tag">Afiliados</span>
            <h2 className="stitle" style={{ fontSize: '1.6rem' }}>Programa de Afiliados</h2>
          </div>'''

if ancora_1 not in src:
    if 'fontSize: \'1.6rem\' }}>Programa de Afiliados' in src:
        print("⚠️  Título da página Afiliados já ajustado. Pulando alteração 1.")
    else:
        print("❌ Âncora 1 não encontrada (título da página Afiliados).")
        sys.exit(1)
else:
    src = src.replace(ancora_1, novo_1, 1)
    print("✅ Alteração 1: título da página Afiliados reduzido para 1.6rem.")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 2 — Substituir placeholder pelo conteúdo real
# ─────────────────────────────────────────────────────────────────────
ancora_2 = '''          {/* ========================================================================= */}
          {/* CONTEÚDO DA PÁGINA "AFILIADOS" — Dr. Ramos, cole/edite seu conteúdo aqui. */}
          {/* ========================================================================= */}
          <div className="reveal" style={{ marginTop: '1.5rem', maxWidth: 800, marginLeft: 'auto', marginRight: 'auto' }}>
            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.8, fontWeight: 600, textAlign: 'justify' }}>
              [Placeholder] Conteúdo da página "Afiliados" virá aqui. Você pode descrever as regras do Programa de
              Afiliados Patrocinado, como se inscrever, benefícios, requisitos (registro em conselho profissional),
              forma de pagamento (PIX, USDC), e exemplos de ganhos.
            </p>
          </div>
          {/* ========================================================================= */}'''

novo_2 = '''          {/* ========================================================================= */}
          {/* CONTEÚDO DA PÁGINA "AFILIADOS" */}
          {/* ========================================================================= */}
          <div className="reveal" style={{ marginTop: '1.5rem', maxWidth: 760, marginLeft: 'auto', marginRight: 'auto' }}>

            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.85, fontWeight: 600, textAlign: 'justify', marginBottom: '1.2rem' }}>
              O <strong style={{ color: 'var(--wine)', fontWeight: 700 }}>Programa de Afiliados RedFairy | OBA</strong> está aberto ao apoio de <strong>empresas, filantropos, organizações sociais e fundações</strong> comprometidos com a ampliação do acesso à iniciativa.
            </p>

            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.85, fontWeight: 600, textAlign: 'justify', marginBottom: '1.2rem' }}>
              Seu objetivo é estimular e reconhecer <strong style={{ color: 'var(--wine)', fontWeight: 700 }}>médicos e outros profissionais de saúde</strong> que contribuam para expandir seu alcance, seja por meio de avaliações, seja por ações, ideias e iniciativas de difusão. Ao realizar a primeira avaliação de um paciente, o médico ou profissional de saúde já pode optar por integrar o Programa.
            </p>

            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.85, fontWeight: 600, textAlign: 'justify', marginBottom: '1.8rem' }}>
              Apoiar o programa é fortalecer o acesso de pessoas com condições ligadas ao <strong>ferro e à hemoglobina</strong> a mais saúde, desempenho e qualidade de vida.
            </p>

            {/* Fecho com call-to-action — "Entre em contato" é link para o modal */}
            <p style={{ textAlign: 'center', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', margin: '0.5rem 0 0', letterSpacing: '0.3px' }}>
              Quer participar?{' '}
              <a
                href="#contato"
                onClick={(e) => {
                  e.preventDefault()
                  setShowAfiliados(false)
                  setShowContato(true)
                }}
                style={{ color: 'var(--wine)', textDecoration: 'underline', cursor: 'pointer' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--cherry)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--wine)' }}
              >
                Entre em contato
              </a>
              . Será um prazer acolher seu apoio.
            </p>

          </div>
          {/* ========================================================================= */}'''

if ancora_2 not in src:
    if "Programa de Afiliados RedFairy | OBA" in src:
        print("⚠️  Conteúdo da página Afiliados já parece estar inserido. Pulando alteração 2.")
    else:
        print("❌ Âncora 2 não encontrada (placeholder da página Afiliados).")
        sys.exit(1)
else:
    src = src.replace(ancora_2, novo_2, 1)
    print("✅ Alteração 2: conteúdo institucional da página Afiliados inserido.")
    print("   - 3 parágrafos diagramados com destaques em wine")
    print("   - Fecho com 'Entre em contato' LINKADO ao modal Contato")

# ─────────────────────────────────────────────────────────────────────
ARQ.write_text(src, encoding="utf-8")
print(f"\n🎉 Arquivo salvo: {ARQ.resolve()}")
print("\nPróximos passos:")
print("  git add . && git commit -m \"feat: conteúdo institucional da página Afiliados\" && git push origin main")
