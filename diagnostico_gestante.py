"""
diagnostico_gestante.py

Mapeia como 'gestante' aparece em:
  - Calculator.jsx
  - PatientDashboard.jsx
  - OBAModal.jsx

Objetivo: ver o input atual de Gestante em cada tela, e o Status
Gestacional no OBAModal, para planejar a Fase 1 (acrescentar
campos de semanas e DUM, propagar ao OBA).
"""

from pathlib import Path

def buscar_contexto(path: Path, termos: list, contexto_antes: int = 3, contexto_depois: int = 15, max_per_term: int = 4):
    if not path.exists():
        print(f"\n[pular] {path} nao existe")
        return
    src = path.read_text(encoding="utf-8")
    linhas = src.splitlines()

    print(f"\n######### {path} #########")

    for termo in termos:
        ocorrencias = [i for i, l in enumerate(linhas) if termo.lower() in l.lower()]
        if not ocorrencias:
            continue
        print(f"\n  >>> BUSCA: '{termo}' — {len(ocorrencias)} ocorrencia(s)")
        for n, i in enumerate(ocorrencias[:max_per_term]):
            ini = max(0, i - contexto_antes)
            fim = min(len(linhas), i + contexto_depois)
            print(f"\n  --- linha {i+1} ---")
            for j in range(ini, fim):
                marca = ">>" if j == i else "  "
                trecho = linhas[j][:220]
                if len(linhas[j]) > 220:
                    trecho += "..."
                print(f"  {marca} {j+1:5d}: {trecho}")
        if len(ocorrencias) > max_per_term:
            print(f"  ... (mais {len(ocorrencias)-max_per_term} ocorrencias omitidas)")

# Calculator.jsx
buscar_contexto(
    Path("src/components/Calculator.jsx"),
    ["gestante", "semanas_gestacao", "hipermenorreia"],
    contexto_antes=2,
    contexto_depois=8,
    max_per_term=3,
)

# PatientDashboard.jsx
buscar_contexto(
    Path("src/components/PatientDashboard.jsx"),
    ["gestante", "semanas_gestacao", "hipermenorreia"],
    contexto_antes=2,
    contexto_depois=8,
    max_per_term=3,
)

# OBAModal.jsx — status gestacional
buscar_contexto(
    Path("src/components/OBAModal.jsx"),
    ["status_gestacional", "GRÁVIDA", "semanas_gestacao"],
    contexto_antes=3,
    contexto_depois=15,
    max_per_term=3,
)

# decisionEngine.js — como gestante eh usado
buscar_contexto(
    Path("src/engine/decisionEngine.js"),
    ["gestante"],
    contexto_antes=2,
    contexto_depois=8,
    max_per_term=3,
)

# Tabela avaliacoes — estrutura no Supabase (nao acesso direto, mas via codigo)
print("\n\n" + "=" * 70)
print("CAMPOS INSERIDOS EM 'avaliacoes' no Supabase (baseado em Calculator e PatientDashboard)")
print("=" * 70)
for path in [Path("src/components/Calculator.jsx"), Path("src/components/PatientDashboard.jsx")]:
    if not path.exists():
        continue
    src = path.read_text(encoding="utf-8")
    # busca bloco .insert({...}) relacionado a avaliacoes
    import re
    m = re.search(r"\.from\('avaliacoes'\)\.insert\(\{([^}]+)\}", src, re.DOTALL)
    if m:
        print(f"\n### {path} — campos de insert:")
        print(m.group(1))

print("\n" + "=" * 70)
print("Cole TUDO no chat.")
print("=" * 70)
