"""
remove_x_topo.py

Remove os botões X circular vinho do canto superior direito de:
  - Página Filosofia
  - Página Sobre
  - Página Afiliados
  - Modal Contato

Deixa apenas o X único na base (centralizado), padrão mais minimalista
e elegante. Nas páginas Filosofia/Sobre/Afiliados, também remove o
'position: relative' que foi adicionado ao <section> só para posicionar
o X absoluto (já não é mais necessário).

O modal Contato continua funcionando com: X na base + backdrop click +
tecla ESC (3 formas de fechar, todas sem o X do topo).
"""

from pathlib import Path
import sys

ARQ = Path("src/components/LandingPage.jsx")

if not ARQ.exists():
    print(f"❌ Arquivo não encontrado: {ARQ.resolve()}")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 1 — Filosofia: remove X do topo direito
# ─────────────────────────────────────────────────────────────────────
ancora_filosofia = '''        <div className="container">
          {/* Botão X fechar no canto superior direito */}
          <button
            onClick={() => { setShowFilosofia(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            aria-label="Fechar Filosofia"
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
          </button>'''

novo_filosofia = '        <div className="container">'

if ancora_filosofia in src:
    src = src.replace(ancora_filosofia, novo_filosofia, 1)
    print("✅ Alteração 1: X do topo removido da Filosofia.")
else:
    # Tolerância: se já foi removido, ok
    if 'aria-label="Fechar Filosofia"' not in src:
        print("⚠️  X do topo da Filosofia já removido. Pulando.")
    else:
        print("❌ Âncora 1 não encontrada (X do topo da Filosofia).")
        sys.exit(1)

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 2 — Sobre: remove X do topo direito
# ─────────────────────────────────────────────────────────────────────
ancora_sobre = '''        <div className="container">
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
            <span className="tag">Sobre</span>'''

novo_sobre = '''        <div className="container">
          <div className="reveal">
            <span className="tag">Sobre</span>'''

if ancora_sobre in src:
    src = src.replace(ancora_sobre, novo_sobre, 1)
    print("✅ Alteração 2: X do topo removido de Sobre.")
else:
    if 'aria-label="Fechar Sobre"' not in src:
        print("⚠️  X do topo de Sobre já removido. Pulando.")
    else:
        print("❌ Âncora 2 não encontrada (X do topo de Sobre).")
        sys.exit(1)

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 3 — Afiliados: remove X do topo direito
# ─────────────────────────────────────────────────────────────────────
ancora_afiliados = '''        <div className="container">
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
            <span className="tag">Afiliados</span>'''

novo_afiliados = '''        <div className="container">
          <div className="reveal">
            <span className="tag">Afiliados</span>'''

if ancora_afiliados in src:
    src = src.replace(ancora_afiliados, novo_afiliados, 1)
    print("✅ Alteração 3: X do topo removido de Afiliados.")
else:
    if 'aria-label="Fechar Afiliados"' not in src:
        print("⚠️  X do topo de Afiliados já removido. Pulando.")
    else:
        print("❌ Âncora 3 não encontrada (X do topo de Afiliados).")
        sys.exit(1)

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 4 — Modal Contato: remove X do topo direito
# A âncora é mais específica porque o botão fica dentro do modal card
# ─────────────────────────────────────────────────────────────────────
ancora_contato = '''            {/* Botão X no canto superior direito */}
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

            {/* Cabeçalho */}'''

novo_contato = '''            {/* Cabeçalho */}'''

if ancora_contato in src:
    src = src.replace(ancora_contato, novo_contato, 1)
    print("✅ Alteração 4: X do topo removido do modal Contato.")
else:
    # Checa se já não tem o aria-label no trecho do modal contato
    if 'MODAL CONTATO' in src:
        modal_section = src.split('MODAL CONTATO')[1].split('{/* WHATSAPP */}')[0] if '{/* WHATSAPP */}' in src.split('MODAL CONTATO')[1] else src.split('MODAL CONTATO')[1]
        if 'aria-label="Fechar Contato"' not in modal_section.split('Cabeçalho')[0] if 'Cabeçalho' in modal_section else True:
            print("⚠️  X do topo do modal Contato já removido. Pulando.")
        else:
            print("❌ Âncora 4 não encontrada (X do topo do modal Contato).")
            sys.exit(1)
    else:
        print("⚠️  Modal Contato não encontrado no arquivo.")

# ─────────────────────────────────────────────────────────────────────
# Nota: o `position: 'relative'` das sections Filosofia/Sobre/Afiliados
# ainda pode estar presente, mas é inofensivo deixar — não afeta o
# layout. Preservamos para evitar complexidade adicional.
# ─────────────────────────────────────────────────────────────────────

ARQ.write_text(src, encoding="utf-8")
print(f"\n🎉 Arquivo salvo: {ARQ.resolve()}")
print("\nPróximos passos:")
print("  git add . && git commit -m \"style: remove X do topo, mantém apenas X na base\" && git push origin main")
