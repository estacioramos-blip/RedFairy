"""
center_nav_menu.py

Centraliza o menu de navegação no desktop usando grid de 3 colunas:
  [logo | links centralizados | espaço simétrico]

Alterações:
  1. No CSS do #landing-nav: muda justify-content: space-between → grid 3 colunas
  2. No CSS do .nav-links: adiciona justify-content: center
  3. Remove o botão "Acessar" de dentro do .nav-links (fica só nos CTAs da página)
  4. Adiciona um <div /> vazio como 3ª coluna para simetria
  5. Garante que no mobile o hamburger continue à direita (override)
"""

from pathlib import Path
import sys

ARQ = Path("src/components/LandingPage.jsx")

if not ARQ.exists():
    print(f"❌ Arquivo não encontrado: {ARQ.resolve()}")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 1 — CSS do #landing-nav: vira grid de 3 colunas no desktop
# ─────────────────────────────────────────────────────────────────────
ancora_1 = (
    "  #landing-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; padding: 0.75rem 2rem; "
    "display: flex; justify-content: space-between; align-items: center; transition: all 0.3s; box-sizing: border-box; }"
)

novo_1 = (
    "  #landing-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; padding: 0.75rem 2rem; "
    "display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; transition: all 0.3s; box-sizing: border-box; }"
)

if ancora_1 not in src:
    print("❌ Âncora 1 não encontrada (CSS #landing-nav).")
    sys.exit(1)

if "grid-template-columns: 1fr auto 1fr" in src:
    print("⚠️  Nav já está em grid 3 colunas. Pulando alteração 1.")
else:
    src = src.replace(ancora_1, novo_1, 1)
    print("✅ Alteração 1: nav desktop agora é grid de 3 colunas (centraliza o menu).")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 2 — CSS do .nav-links: centraliza os links
# ─────────────────────────────────────────────────────────────────────
ancora_2 = "  .nav-links { display: flex; gap: 1.8rem; align-items: center; }"
novo_2   = "  .nav-links { display: flex; gap: 1.8rem; align-items: center; justify-content: center; }"

if ancora_2 in src and "justify-content: center" not in src.split(".nav-links {")[1].split("}")[0]:
    src = src.replace(ancora_2, novo_2, 1)
    print("✅ Alteração 2: .nav-links centralizado (justify-content: center).")
elif ancora_2 not in src:
    print("❌ Âncora 2 não encontrada (CSS .nav-links).")
    sys.exit(1)
else:
    print("⚠️  .nav-links já centralizado. Pulando alteração 2.")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 3 — CSS mobile do .nav-links.open: zera grid no mobile
# No mobile o grid de 3 colunas precisa virar flex de novo pro hamburger
# funcionar como antes (canto direito).
# ─────────────────────────────────────────────────────────────────────
ancora_3 = "    .nav-links { display: none; }"
novo_3 = (
    "    #landing-nav { display: flex !important; justify-content: space-between !important; }\n"
    "    .nav-links { display: none; }"
)

if ancora_3 not in src:
    print("❌ Âncora 3 não encontrada (CSS mobile .nav-links).")
    sys.exit(1)

if "#landing-nav { display: flex !important" in src:
    print("⚠️  Override mobile já aplicado. Pulando alteração 3.")
else:
    src = src.replace(ancora_3, novo_3, 1)
    print("✅ Alteração 3: nav mobile volta a ser flex (logo esquerda + hamburger direita).")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 4 — JSX: remove o botão "Acessar" de dentro dos nav-links
#                e adiciona uma <div /> vazia como 3ª coluna para simetria
# ─────────────────────────────────────────────────────────────────────
ancora_4 = (
    '          <a href="#oba" onClick={() => setNavOpen(false)}>Projeto OBA</a>\n'
    '          <button className="btn-sm btn-wine" onClick={() => { onModoMedico(); setNavOpen(false) }}>Acessar</button>\n'
    '        </div>\n'
    '        <button className="hamburger" onClick={() => setNavOpen(!navOpen)}>\n'
    '          <span /><span /><span />\n'
    '        </button>'
)

novo_4 = (
    '          <a href="#oba" onClick={() => setNavOpen(false)}>Projeto OBA</a>\n'
    '        </div>\n'
    '        {/* 3ª coluna vazia para simetria do grid (mantém menu centralizado) */}\n'
    '        <div style={{ display: \'flex\', justifyContent: \'flex-end\' }}>\n'
    '          <button className="hamburger" onClick={() => setNavOpen(!navOpen)}>\n'
    '            <span /><span /><span />\n'
    '          </button>\n'
    '        </div>'
)

if ancora_4 not in src:
    print("❌ Âncora 4 não encontrada (botão Acessar + hamburger).")
    print("   Pode ser que já tenha sido alterado. Verifique manualmente.")
    sys.exit(1)

if "3ª coluna vazia para simetria do grid" in src:
    print("⚠️  Estrutura do nav já ajustada. Pulando alteração 4.")
else:
    src = src.replace(ancora_4, novo_4, 1)
    print("✅ Alteração 4: botão 'Acessar' removido do nav + 3ª coluna de simetria adicionada.")

# ─────────────────────────────────────────────────────────────────────
ARQ.write_text(src, encoding="utf-8")
print(f"\n🎉 Arquivo salvo: {ARQ.resolve()}")
print("\nPróximos passos:")
print("  git add . && git commit -m \"feat: centraliza menu no nav desktop\" && git push origin main")
