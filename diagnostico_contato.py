"""
diagnostico_contato.py

Script de diagnóstico: verifica o estado atual do modal Contato no arquivo
LandingPage.jsx, listando presença de marcadores e mostrando trechos
relevantes para descobrir por que os scripts anteriores não estão aplicando.
"""

from pathlib import Path

ARQ = Path("src/components/LandingPage.jsx")

if not ARQ.exists():
    print(f"❌ Arquivo não encontrado: {ARQ.resolve()}")
    exit(1)

src = ARQ.read_text(encoding="utf-8")

print("=" * 70)
print("DIAGNÓSTICO DO MODAL CONTATO")
print("=" * 70)

marcadores = [
    "MODAL CONTATO",
    "showContato",
    "CONTEÚDO DO MODAL CONTATO",
    "Laíse",
    "Lai?se",  # com encoding diferente
    "Placeholder",
    "[Placeholder]",
    "Dantas",
    "CYTOMICA",
    "Cytomica",
    "Barro Vermelho",
    "Fale com a gente",
    "E.F. Ramos, M.D.",
    "Outros membros da equipe",
    "Rua, número, bairro",
    "Outros telefones, email",
    "Equipe",
    "<h3",
]

print("\n🔍 Presença de marcadores:\n")
for m in marcadores:
    count = src.count(m)
    status = "✅" if count > 0 else "❌"
    print(f"  {status}  '{m}': {count} ocorrência(s)")

print("\n" + "=" * 70)
print("TRECHO DO MODAL CONTATO")
print("=" * 70)

if "MODAL CONTATO" in src:
    idx_inicio = src.find("{/* MODAL CONTATO */}")
    if idx_inicio < 0:
        idx_inicio = src.find("MODAL CONTATO")
    # Tentamos encontrar o fim do modal (antes de próximo comentário ou section)
    idx_fim = src.find("{/* WHATSAPP", idx_inicio)
    if idx_fim < 0 or idx_fim - idx_inicio > 5000:
        idx_fim = idx_inicio + 4500
    
    print(f"\n(mostrando caracteres {idx_inicio} até {idx_fim})\n")
    print("─" * 70)
    print(src[idx_inicio:idx_fim])
    print("─" * 70)
else:
    print("\n⚠️  Comentário 'MODAL CONTATO' não encontrado.")

print("\n" + "=" * 70)
print("Cole o output completo no chat para análise.")
print("=" * 70)
