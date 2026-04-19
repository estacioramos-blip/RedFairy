"""
add_sobre_content.py

Substitui o placeholder da página Sobre pelo texto institucional real.

Diagramação:
  - Parágrafos em prose limpa, justificado
  - Marcas (RedFairy®, Cytomica®, Projeto OBA™) destacadas em wine + peso 700
  - Marcadores ® e ™ como <sup> (superscript elegante)
  - Nome do Dr. Estácio Ferreira Ramos destacado em wine + peso 700
  - Última linha "Explore. Entenda. Compartilhe." numa .highlight-box vinho
    centralizada (mesma que já existe no CSS da Filosofia)
"""

from pathlib import Path
import sys

ARQ = Path("src/components/LandingPage.jsx")

if not ARQ.exists():
    print(f"❌ Arquivo não encontrado: {ARQ.resolve()}")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────
# Localizamos o bloco de placeholder atual da página Sobre
# e substituímos pelo conteúdo real diagramado.
# ─────────────────────────────────────────────────────────────────────
ancora = '''          {/* ===================================================================== */}
          {/* CONTEÚDO DA PÁGINA "SOBRE" — Dr. Ramos, cole/edite seu conteúdo aqui. */}
          {/* ===================================================================== */}
          <div className="reveal" style={{ marginTop: '1.5rem', maxWidth: 800, marginLeft: 'auto', marginRight: 'auto' }}>
            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.8, fontWeight: 600, textAlign: 'justify' }}>
              [Placeholder] Conteúdo da página "Sobre" virá aqui. Você pode descrever a história do RedFairy,
              a motivação do projeto, a equipe, missão, visão e valores. Esta seção segue o mesmo padrão visual
              da Filosofia — fundo cinza claro, tipografia consistente.
            </p>
          </div>
          {/* ===================================================================== */}'''

novo = '''          {/* ===================================================================== */}
          {/* CONTEÚDO DA PÁGINA "SOBRE" */}
          {/* ===================================================================== */}
          <div className="reveal" style={{ marginTop: '1.5rem', maxWidth: 760, marginLeft: 'auto', marginRight: 'auto' }}>

            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.85, fontWeight: 600, textAlign: 'justify', marginBottom: '1.2rem' }}>
              <strong style={{ color: 'var(--wine)', fontWeight: 700 }}>RedFairy<sup style={{ fontSize: '0.65em', fontWeight: 500 }}>®</sup></strong> e o <strong style={{ color: 'var(--wine)', fontWeight: 700 }}>Projeto OBA<sup style={{ fontSize: '0.65em', fontWeight: 500 }}>TM</sup> — Otimizar o Bariátrico</strong> representam uma iniciativa institucional de <strong style={{ color: 'var(--wine)', fontWeight: 700 }}>Cytomica<sup style={{ fontSize: '0.65em', fontWeight: 500 }}>®</sup></strong>, com forte compromisso ético e social, voltada à melhoria da qualidade de vida de pacientes com doenças e condições crônicas ou agudas que afetam a produção de hemoglobina e de células vermelhas. Entre eles, destacam-se os pacientes bariátricos, que frequentemente demandam atenção clínica especializada.
            </p>

            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.85, fontWeight: 600, textAlign: 'justify', marginBottom: '1.2rem' }}>
              A iniciativa oferece <strong>avaliações iniciais gratuitas</strong>, acionadas por profissionais de saúde com o apoio de um algoritmo médico avançado, seguidas, quando necessário, de acompanhamento acessível, com suporte de inteligência artificial e assistência médica por telemedicina.
            </p>

            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.85, fontWeight: 600, textAlign: 'justify', marginBottom: '1.2rem' }}>
              Desenvolvido ao longo de anos sob a orientação do <strong style={{ color: 'var(--wine)', fontWeight: 700 }}>Dr. Estácio Ferreira Ramos</strong>, hematologista e pesquisador, o projeto reúne rigor médico, inovação e propósito social.
            </p>

            <p style={{ fontSize: '1rem', color: 'var(--text-sec)', lineHeight: 1.85, fontWeight: 600, textAlign: 'justify', marginBottom: '1.8rem' }}>
              O empreendimento inclui ainda um <strong style={{ color: 'var(--wine)', fontWeight: 700 }}>Programa de Afiliados Patrocinado</strong>, destinado a ampliar o alcance da iniciativa e favorecer o acesso de um número crescente de pacientes à avaliação e ao cuidado.
            </p>

            {/* Fecho institucional em destaque vinho */}
            <div className="highlight-box" style={{ textAlign: 'center', padding: '1.4rem 1.5rem', marginTop: '0.5rem' }}>
              <p style={{ color: 'white', fontSize: '1.15rem', fontWeight: 700, margin: 0, letterSpacing: '0.5px' }}>
                Explore. Entenda. Compartilhe.
              </p>
            </div>

          </div>
          {/* ===================================================================== */}'''

if ancora not in src:
    if "RedFairy" in src and "Projeto OBA" in src and "Explore. Entenda. Compartilhe" in src:
        print("⚠️  Conteúdo da página Sobre já parece estar inserido. Pulando.")
        sys.exit(0)
    print("❌ Âncora não encontrada (placeholder da página Sobre).")
    print("   Verifique se o script add_sobre_afiliados.py foi aplicado antes.")
    sys.exit(1)

src = src.replace(ancora, novo, 1)
print("✅ Conteúdo institucional inserido na página Sobre.")
print("   - 4 parágrafos diagramados com destaques em wine")
print("   - Marcas RedFairy®, Cytomica®, Projeto OBA™ destacadas")
print("   - Nome do Dr. Estácio Ferreira Ramos destacado")
print("   - Fecho 'Explore. Entenda. Compartilhe.' em highlight-box vinho")

# ─────────────────────────────────────────────────────────────────────
ARQ.write_text(src, encoding="utf-8")
print(f"\n🎉 Arquivo salvo: {ARQ.resolve()}")
print("\nPróximos passos:")
print("  git add . && git commit -m \"feat: conteúdo institucional da página Sobre\" && git push origin main")
