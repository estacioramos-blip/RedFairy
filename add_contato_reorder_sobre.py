"""
add_contato_reorder_sobre.py

1. Move "Sobre" no nav para a penúltima posição (antes de Contato)
2. Adiciona state showContato
3. Adiciona link "Contato" como último item do nav
4. Cria o modal Contato (overlay centralizado com backdrop, X, botão Fechar, WhatsApp)
5. Adiciona listener de ESC para fechar o modal

Nova ordem do nav:
Home · Filosofia · Afiliados · Como funciona · Indicações · Avaliar · Projeto OBA · Sobre · Contato
"""

from pathlib import Path
import sys

ARQ = Path("src/components/LandingPage.jsx")

if not ARQ.exists():
    print(f"❌ Arquivo não encontrado: {ARQ.resolve()}")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 1 — Adicionar state showContato
# ─────────────────────────────────────────────────────────────────────
ancora_1 = (
    "  const [showSobre, setShowSobre] = useState(false)\n"
    "  const [showAfiliados, setShowAfiliados] = useState(false)"
)
novo_1 = (
    "  const [showSobre, setShowSobre] = useState(false)\n"
    "  const [showAfiliados, setShowAfiliados] = useState(false)\n"
    "  const [showContato, setShowContato] = useState(false)"
)

if ancora_1 not in src:
    print("❌ Âncora 1 não encontrada (states showSobre/showAfiliados).")
    sys.exit(1)

if "showContato" in src:
    print("⚠️  State showContato já existe. Pulando alteração 1.")
else:
    src = src.replace(ancora_1, novo_1, 1)
    print("✅ Alteração 1: state showContato adicionado.")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 2 — Reorganizar links do nav
# Remove "Sobre" da posição atual e adiciona "Sobre" + "Contato" no final
# ─────────────────────────────────────────────────────────────────────
ancora_2 = (
    '          <a href="#filosofia" onClick={() => { setShowFilosofia(true); setNavOpen(false) }}>Filosofia</a>\n'
    '          <a href="#sobre" onClick={() => { setShowSobre(true); setNavOpen(false) }}>Sobre</a>\n'
    '          <a href="#afiliados" onClick={() => { setShowAfiliados(true); setNavOpen(false) }}>Afiliados</a>\n'
    '          <a href="#como-funciona" onClick={() => setNavOpen(false)}>Como funciona</a>\n'
    '          <a href="#indicacoes" onClick={() => setNavOpen(false)}>Indicações</a>\n'
    '          <a href="#avaliar" onClick={() => setNavOpen(false)}>Avaliar</a>\n'
    '          <a href="#oba" onClick={() => setNavOpen(false)}>Projeto OBA</a>'
)

novo_2 = (
    '          <a href="#filosofia" onClick={() => { setShowFilosofia(true); setNavOpen(false) }}>Filosofia</a>\n'
    '          <a href="#afiliados" onClick={() => { setShowAfiliados(true); setNavOpen(false) }}>Afiliados</a>\n'
    '          <a href="#como-funciona" onClick={() => setNavOpen(false)}>Como funciona</a>\n'
    '          <a href="#indicacoes" onClick={() => setNavOpen(false)}>Indicações</a>\n'
    '          <a href="#avaliar" onClick={() => setNavOpen(false)}>Avaliar</a>\n'
    '          <a href="#oba" onClick={() => setNavOpen(false)}>Projeto OBA</a>\n'
    '          <a href="#sobre" onClick={() => { setShowSobre(true); setNavOpen(false) }}>Sobre</a>\n'
    '          <a href="#contato" onClick={(e) => { e.preventDefault(); setShowContato(true); setNavOpen(false) }}>Contato</a>'
)

if ancora_2 not in src:
    print("❌ Âncora 2 não encontrada (links do nav).")
    sys.exit(1)

if '#contato' in src:
    print("⚠️  Link Contato já existe. Pulando alteração 2.")
else:
    src = src.replace(ancora_2, novo_2, 1)
    print("✅ Alteração 2: menu reordenado — Sobre agora penúltimo, Contato último.")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 3 — Adicionar useEffect para ESC fechar modal Contato
# Injeta logo depois do useEffect principal que já existe
# ─────────────────────────────────────────────────────────────────────
ancora_3 = (
    "    return () => {\n"
    "      document.getElementById('landing-css')?.remove()\n"
    "      document.getElementById('landing-fonts')?.remove()\n"
    "      window.removeEventListener('scroll', handleScroll)\n"
    "      obs.disconnect()\n"
    "    }\n"
    "  }, [])"
)

novo_3 = (
    "    return () => {\n"
    "      document.getElementById('landing-css')?.remove()\n"
    "      document.getElementById('landing-fonts')?.remove()\n"
    "      window.removeEventListener('scroll', handleScroll)\n"
    "      obs.disconnect()\n"
    "    }\n"
    "  }, [])\n"
    "\n"
    "  // ESC fecha modal de Contato\n"
    "  useEffect(() => {\n"
    "    if (!showContato) return\n"
    "    const onKey = (e) => { if (e.key === 'Escape') setShowContato(false) }\n"
    "    window.addEventListener('keydown', onKey)\n"
    "    return () => window.removeEventListener('keydown', onKey)\n"
    "  }, [showContato])"
)

if ancora_3 not in src:
    print("❌ Âncora 3 não encontrada (fim do useEffect principal).")
    sys.exit(1)

if "ESC fecha modal de Contato" in src:
    print("⚠️  useEffect ESC já existe. Pulando alteração 3.")
else:
    src = src.replace(ancora_3, novo_3, 1)
    print("✅ Alteração 3: listener de ESC adicionado para fechar modal.")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 4 — Injetar o modal de Contato
# Posiciona logo depois do modal OBA existente
# ─────────────────────────────────────────────────────────────────────
ancora_4 = (
    '      {/* MODAL OBA */}\n'
    '      {showOBA && (\n'
    '        <OBAModal\n'
    '          sexo={sexoOBA}\n'
    '          idade={idadeOBA}\n'
    '          cpf={null}\n'
    '          onConcluir={() => { setShowOBA(false); onModoPaciente() }}\n'
    '          onFechar={() => setShowOBA(false)}\n'
    '        />\n'
    '      )}'
)

novo_4 = '''      {/* MODAL OBA */}
      {showOBA && (
        <OBAModal
          sexo={sexoOBA}
          idade={idadeOBA}
          cpf={null}
          onConcluir={() => { setShowOBA(false); onModoPaciente() }}
          onFechar={() => setShowOBA(false)}
        />
      )}

      {/* MODAL CONTATO */}
      {showContato && (
        <div
          onClick={() => setShowContato(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(15,18,25,0.75)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem', animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 16, maxWidth: 560, width: '100%',
              maxHeight: '90vh', overflowY: 'auto', position: 'relative',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              padding: '2.5rem 2rem 2rem',
            }}
          >
            {/* Botão X no canto superior direito */}
            <button
              onClick={() => setShowContato(false)}
              aria-label="Fechar Contato"
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
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

            {/* Cabeçalho */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <span className="tag" style={{ color: 'var(--cherry)' }}>Contato</span>
              <h2 style={{ fontSize: '1.8rem', color: 'var(--wine)', fontWeight: 800, marginTop: '0.4rem' }}>
                Fale com a gente
              </h2>
            </div>

            {/* ===================================================================== */}
            {/* CONTEÚDO DO MODAL CONTATO — Dr. Ramos, edite aqui os dados reais.     */}
            {/* ===================================================================== */}

            {/* Pessoas */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-light)', fontWeight: 700, marginBottom: '0.8rem' }}>
                Equipe
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.7, fontWeight: 600, margin: 0 }}>
                <strong>E.F. Ramos, M.D.</strong> — CRM 6302 BA<br/>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-sec)', fontWeight: 500 }}>[Placeholder] Outros membros da equipe</span>
              </p>
            </div>

            {/* Endereço */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-light)', fontWeight: 700, marginBottom: '0.8rem' }}>
                Endereço
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.7, fontWeight: 500, margin: 0 }}>
                [Placeholder] Rua, número, bairro<br/>
                Salvador — BA · CEP XXXXX-XXX
              </p>
            </div>

            {/* Telefones */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-light)', fontWeight: 700, marginBottom: '0.8rem' }}>
                Telefones
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.7, fontWeight: 500, margin: 0 }}>
                <strong style={{ color: 'var(--wine)' }}>+55 71 99711-0804</strong> — Plataforma<br/>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-sec)' }}>[Placeholder] Outros telefones, email, etc.</span>
              </p>
            </div>

            {/* ===================================================================== */}

            {/* Botão WhatsApp grande */}
            <a
              href="https://wa.me/5571997110804"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                width: '100%', background: '#25D366', color: 'white',
                padding: '0.9rem 1.2rem', borderRadius: 10,
                fontSize: '1rem', fontWeight: 700, textDecoration: 'none',
                transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(37,211,102,0.3)',
                marginBottom: '1rem',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,211,102,0.4)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,211,102,0.3)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Conversar no WhatsApp
            </a>

            {/* Botão Fechar */}
            <button
              className="btn btn-secondary"
              onClick={() => setShowContato(false)}
              style={{ width: '100%', minWidth: 'auto', height: 50 }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}'''

if ancora_4 not in src:
    print("❌ Âncora 4 não encontrada (fim do MODAL OBA).")
    sys.exit(1)

if "{/* MODAL CONTATO */}" in src:
    print("⚠️  Modal Contato já existe. Pulando alteração 4.")
else:
    src = src.replace(ancora_4, novo_4, 1)
    print("✅ Alteração 4: modal Contato injetado com placeholders editáveis.")

# ─────────────────────────────────────────────────────────────────────
ARQ.write_text(src, encoding="utf-8")
print(f"\n🎉 Arquivo salvo: {ARQ.resolve()}")
print("\nPróximos passos:")
print("  git add . && git commit -m \"feat: reordena Sobre e adiciona modal Contato\" && git push origin main")
print("\nPara editar dados do contato, procure em LandingPage.jsx por:")
print("  'CONTEÚDO DO MODAL CONTATO'")
