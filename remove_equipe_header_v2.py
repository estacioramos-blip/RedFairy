"""
remove_equipe_header_v2.py

Versão resiliente: remove o cabeçalho 'Equipe' do modal Contato usando
regex em vez de match exato de string (para tolerar diferenças de
formatação, espaços e quebras de linha).
"""

from pathlib import Path
import re
import sys

ARQ = Path("src/components/LandingPage.jsx")

if not ARQ.exists():
    print(f"❌ Arquivo não encontrado: {ARQ.resolve()}")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────
# Antes de aplicar: checagem de idempotência
# ─────────────────────────────────────────────────────────────────────
if '{/* Contato direto */}' in src:
    print("⚠️  Cabeçalho 'Equipe' já foi removido em execução anterior. Nada a fazer.")
    sys.exit(0)

# ─────────────────────────────────────────────────────────────────────
# Regex flexível: captura do comentário {/* Equipe */} até o </div> que
# fecha o bloco logo após o </p> contendo "COO". Usa DOTALL para casar
# quebras de linha.
# ─────────────────────────────────────────────────────────────────────
padrao = re.compile(
    r'\{/\*\s*Equipe\s*\*/\}\s*'                  # comentário {/* Equipe */}
    r'<div[^>]*>\s*'                              # abre div container
    r'<h3[^>]*>\s*Equipe\s*</h3>\s*'              # h3 com texto Equipe
    r'<p[^>]*>.*?Laíse Silva Dantas.*?COO.*?</p>\s*'  # p com nome e cargo
    r'</div>',                                    # fecha div container
    re.DOTALL
)

novo = '''{/* Contato direto */}
            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <p style={{ fontSize: '1.05rem', color: 'var(--text)', lineHeight: 1.6, fontWeight: 700, margin: 0 }}>
                <strong style={{ color: 'var(--wine)' }}>Laíse Silva Dantas</strong>
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-sec)', fontWeight: 500, margin: '0.2rem 0 0', letterSpacing: '1px', textTransform: 'uppercase' }}>
                COO
              </p>
            </div>'''

match = padrao.search(src)
if not match:
    print("❌ Não consegui encontrar o bloco da 'Equipe' nem com regex flexível.")
    print("   Vou mostrar o trecho do arquivo que contém 'Laíse' para diagnóstico:\n")
    idx = src.find('Laíse')
    if idx >= 0:
        inicio = max(0, idx - 400)
        fim = min(len(src), idx + 400)
        print("─" * 60)
        print(src[inicio:fim])
        print("─" * 60)
        print("\n   Cole o trecho acima no chat para eu ajustar manualmente.")
    else:
        print("   O nome 'Laíse' sequer aparece no arquivo.")
    sys.exit(1)

src_novo = padrao.sub(novo, src, count=1)
ARQ.write_text(src_novo, encoding="utf-8")

print("✅ Cabeçalho 'Equipe' removido via regex.")
print("   Laíse Silva Dantas + COO agora centralizados, sem header redundante.")
print(f"\n🎉 Arquivo salvo: {ARQ.resolve()}")
print("\nPróximos passos:")
print("  git add . && git commit -m \"style: remove cabeçalho Equipe do modal Contato\" && git push origin main")
