"""
fix_nav_overlap_sections.py

Corrige o problema do nav fixo cobrir parcialmente o topo do conteúdo
quando o usuário navega até uma âncora (#filosofia, #indicacoes, etc)
ou quando uma seção expansível abre.

Duas estratégias combinadas:
  1. scroll-margin-top: 80px em todas as <section> — faz o navegador
     parar com essa folga antes do nav ao rolar para uma âncora
  2. padding-top extra nas seções expansíveis (filosofia, sobre, afiliados)
     — para o conteúdo nascer abaixo do nav quando abertas

Altura estimada do nav: ~60px. Usa 80px para margem confortável.
"""

from pathlib import Path
import sys

ARQ = Path("src/components/LandingPage.jsx")

if not ARQ.exists():
    print(f"❌ Arquivo não encontrado: {ARQ.resolve()}")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 1 — scroll-margin-top global em todas as <section>
# Âncora: a regra CSS geral de section que já existe
# ─────────────────────────────────────────────────────────────────────
ancora_1 = "  section { padding: 3rem 2rem; }"
novo_1   = "  section { padding: 3rem 2rem; scroll-margin-top: 80px; }"

if ancora_1 not in src:
    if "scroll-margin-top: 80px" in src:
        print("⚠️  scroll-margin-top já aplicado. Pulando alteração 1.")
    else:
        print("❌ Âncora 1 não encontrada (CSS section).")
        sys.exit(1)
else:
    src = src.replace(ancora_1, novo_1, 1)
    print("✅ Alteração 1: scroll-margin-top: 80px aplicado a todas as <section>.")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 2 — padding-top extra na .filosofia
# A seção .filosofia (reutilizada também para #sobre e #afiliados) tem
# padding-top: 1rem que é muito pequeno — o conteúdo encosta no nav.
# Aumentamos para 5rem (80px) para dar o mesmo respiro visual.
# ─────────────────────────────────────────────────────────────────────
ancora_2 = "  .filosofia { background: var(--gray-bg); color: var(--text); position: relative; padding-top: 1rem; padding-bottom: 1.5rem; }"
novo_2   = "  .filosofia { background: var(--gray-bg); color: var(--text); position: relative; padding-top: 5rem; padding-bottom: 1.5rem; }"

if ancora_2 not in src:
    if "padding-top: 5rem; padding-bottom: 1.5rem" in src:
        print("⚠️  Padding-top da .filosofia já ajustado. Pulando alteração 2.")
    else:
        print("❌ Âncora 2 não encontrada (CSS .filosofia).")
        sys.exit(1)
else:
    src = src.replace(ancora_2, novo_2, 1)
    print("✅ Alteração 2: padding-top da .filosofia (e Sobre/Afiliados) ajustado para 5rem.")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO 3 — Ajuste mobile: no mobile o nav tem altura ligeiramente
# diferente, e o padding atual de section mobile é 2.5rem 0.6rem.
# Não precisa mexer porque scroll-margin-top: 80px já cobre desktop e mobile,
# mas o mobile tem fila de padding menor. Deixamos como está — 80px
# funciona bem em ambos (nav mobile também tem ~60px de altura).
# ─────────────────────────────────────────────────────────────────────
print("ℹ️  Mobile: scroll-margin-top: 80px funciona bem para nav mobile (~60px altura).")

# ─────────────────────────────────────────────────────────────────────
ARQ.write_text(src, encoding="utf-8")
print(f"\n🎉 Arquivo salvo: {ARQ.resolve()}")
print("\nPróximos passos:")
print("  git add . && git commit -m \"fix: espaço no topo das seções para não serem cobertas pelo nav\" && git push origin main")
