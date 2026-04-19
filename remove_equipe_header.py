"""
remove_equipe_header.py

Remove o cabeçalho 'EQUIPE' do modal Contato, já que há apenas uma
pessoa de contato. O nome (Laíse Silva Dantas) e o cargo (COO) se
apresentam diretamente, sem a redundância de um header para uma só entrada.
"""

from pathlib import Path
import sys

ARQ = Path("src/components/LandingPage.jsx")

if not ARQ.exists():
    print(f"❌ Arquivo não encontrado: {ARQ.resolve()}")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────
# ALTERAÇÃO — Remove o <h3> "Equipe" do bloco de contato
# Mantém nome e cargo, só tira o header pequeno em caixa alta
# ─────────────────────────────────────────────────────────────────────
ancora = '''            {/* Equipe */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-light)', fontWeight: 700, marginBottom: '0.8rem' }}>
                Equipe
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.7, fontWeight: 600, margin: 0 }}>
                <strong style={{ color: 'var(--wine)' }}>Laíse Silva Dantas</strong><br/>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-sec)', fontWeight: 500 }}>COO</span>
              </p>
            </div>'''

novo = '''            {/* Contato direto */}
            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <p style={{ fontSize: '1.05rem', color: 'var(--text)', lineHeight: 1.6, fontWeight: 700, margin: 0 }}>
                <strong style={{ color: 'var(--wine)' }}>Laíse Silva Dantas</strong>
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-sec)', fontWeight: 500, margin: '0.2rem 0 0', letterSpacing: '1px', textTransform: 'uppercase' }}>
                COO
              </p>
            </div>'''

if ancora not in src:
    if '{/* Contato direto */}' in src:
        print("⚠️  Cabeçalho Equipe já foi removido. Pulando.")
        sys.exit(0)
    print("❌ Âncora não encontrada (bloco Equipe do modal).")
    sys.exit(1)

src = src.replace(ancora, novo, 1)
print("✅ Cabeçalho 'Equipe' removido.")
print("   Laíse Silva Dantas + COO agora centralizados, sem header redundante.")

# ─────────────────────────────────────────────────────────────────────
ARQ.write_text(src, encoding="utf-8")
print(f"\n🎉 Arquivo salvo: {ARQ.resolve()}")
print("\nPróximos passos:")
print("  git add . && git commit -m \"style: remove cabeçalho Equipe do modal Contato\" && git push origin main")
