"""
add_home_menu.py

Adiciona item "Home" como PRIMEIRO item do menu de navegação do LandingPage.jsx.

Comportamento:
  - Fecha todas as seções expansíveis abertas (Filosofia, Sobre, Afiliados)
  - Faz scroll suave até o topo da página
  - Fecha o menu mobile (hamburger)

Bônus: torna a logo (nav-brand) clicável com o mesmo comportamento — padrão universal web.

Duas alterações:
  1. Envolve a nav-brand num <a> com onClick handler
  2. Injeta o link "Home" como primeiro item dentro de .nav-links
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
# ALTERAÇÃO 1 — Torna a nav-brand (logo) clicável
# ─────────────────────────────────────────────────────────────────────
ancora_1 = (
    '        <div className="nav-brand">\n'
    '          <img src={logo} alt="RedFairy" style={{ height:36 }} />\n'
    '          <span>Red<em>Fairy</em></span>\n'
    '        </div>'
)

novo_1 = (
    '        <a\n'
    '          href="#home"\n'
    '          className="nav-brand"\n'
    '          onClick={(e) => {\n'
    '            e.preventDefault()\n'
    '            setShowFilosofia(false)\n'
    '            setShowSobre(false)\n'
    '            setShowAfiliados(false)\n'
    '            setNavOpen(false)\n'
    '            window.scrollTo({ top: 0, behavior: \'smooth\' })\n'
    '          }}\n'
    '          style={{ cursor: \'pointer\' }}\n'
    '        >\n'
    '          <img src={logo} alt="RedFairy" style={{ height:36 }} />\n'
    '          <span>Red<em>Fairy</em></span>\n'
    '        </a>'
)

if ancora_1 not in src:
    print("❌ Âncora 1 não encontrada (nav-brand div).")
    sys.exit(1)

if 'href="#home"\n          className="nav-brand"' in src:
    print("⚠️  Logo já é clicável. Pulando alteração 1.")
else:
    src = src.replace(ancora_1, novo_1, 1)
    print("✅ Alteração 1: logo (nav-brand) agora é clicável e volta ao topo.")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 2 — Adiciona link "Home" como PRIMEIRO item do menu
# ─────────────────────────────────────────────────────────────────────
ancora_2 = (
    '        <div className={`nav-links${navOpen ? \' open\' : \'\'}`}>\n'
    '          <a href="#filosofia" onClick={() => { setShowFilosofia(true); setNavOpen(false) }}>Filosofia</a>'
)

novo_2 = (
    '        <div className={`nav-links${navOpen ? \' open\' : \'\'}`}>\n'
    '          <a\n'
    '            href="#home"\n'
    '            onClick={(e) => {\n'
    '              e.preventDefault()\n'
    '              setShowFilosofia(false)\n'
    '              setShowSobre(false)\n'
    '              setShowAfiliados(false)\n'
    '              setNavOpen(false)\n'
    '              window.scrollTo({ top: 0, behavior: \'smooth\' })\n'
    '            }}\n'
    '          >Home</a>\n'
    '          <a href="#filosofia" onClick={() => { setShowFilosofia(true); setNavOpen(false) }}>Filosofia</a>'
)

if ancora_2 not in src:
    print("❌ Âncora 2 não encontrada (início dos nav-links).")
    sys.exit(1)

if 'href="#home"\n            onClick' in src:
    print("⚠️  Link 'Home' já existe no nav. Pulando alteração 2.")
else:
    src = src.replace(ancora_2, novo_2, 1)
    print("✅ Alteração 2: link 'Home' adicionado como primeiro item do menu.")

# ─────────────────────────────────────────────────────────────────────
ARQ.write_text(src, encoding="utf-8")
print(f"\n🎉 Arquivo salvo: {ARQ.resolve()}")
print("\nPróximos passos:")
print("  git add . && git commit -m \"feat: adiciona Home no menu e torna logo clicável\" && git push origin main")
