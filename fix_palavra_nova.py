"""
fix_palavra_nova.py

Bug: textos matriciais mencionam 'NOVA DOAÇÃO' ou 'NOVA SANGRIA'
mesmo quando a paciente nao tem historico de perda/sangria
(flag 'perda' === false). A palavra 'NOVA' pressupoe antecedente,
e seu uso e inadequado sem esse historico.

Fix: pos-processamento no decisionEngine.js. Apos o matching,
quando inputs.perda === false, remove a palavra 'NOVA' dos campos
de texto do resultado.

Cobre 69 ocorrencias totais:
  - 64x NOVA DOAÇÃO
  - 1x  NOVA DOACAO (sem acento)
  - 4x  NOVA SANGRIA

Alteracao minima (uma funcao + uma chamada); nao toca nas matrizes.
"""

from pathlib import Path
import sys

ARQ = Path("src/engine/decisionEngine.js")
if not ARQ.exists():
    print(f"ERRO: {ARQ} nao existe.")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# Descobrir onde o resultado eh retornado para inserir o pos-processamento
# antes do return.
# ═════════════════════════════════════════════════════════════════════

# Buscar o return final da funcao avaliarPaciente
# Estrategia: achar a linha 'const resultado = matrix.find(...)' e inserir
# o pos-processamento logo apos, mas antes de construir o objeto final.

# Marcador seguro: logo apos 'const resultado = matrix.find(...)'
ancora = """  const resultado = matrix.find(item => matchesConditions(item, inputsAjustados));"""

if "ancora de palavra NOVA" in src or "// Fix palavra 'NOVA'" in src:
    print("AVISO: fix da palavra NOVA ja foi aplicado.")
    sys.exit(0)

if ancora not in src:
    print("ERRO: ancora 'const resultado = matrix.find(...)' nao encontrada.")
    sys.exit(1)

novo = """  const resultado = matrix.find(item => matchesConditions(item, inputsAjustados));

  // Fix palavra 'NOVA': se paciente NAO tem historico de perda/sangria,
  // a palavra 'NOVA' antes de DOACAO/SANGRIA pressupoe antecedente inexistente.
  // Remover 'NOVA ' para manter o texto coerente.
  if (resultado && !inputs.perda) {
    const limparNova = (txt) => typeof txt === 'string'
      ? txt.replace(/NOVA DOA[ÇC][ÃA]O/g, 'DOAÇÃO')
           .replace(/nova doa[çc][ãa]o/g, 'doação')
           .replace(/NOVA SANGRIA/g, 'SANGRIA')
           .replace(/nova sangria/g, 'sangria')
      : txt;
    resultado.diagnostico      = limparNova(resultado.diagnostico);
    resultado.recomendacaoAge1 = limparNova(resultado.recomendacaoAge1);
    resultado.recomendacaoAge2 = limparNova(resultado.recomendacaoAge2);
  }"""

src = src.replace(ancora, novo, 1)
ARQ.write_text(src, encoding="utf-8")
print("OK: pos-processamento da palavra 'NOVA' adicionado ao decisionEngine.")

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("FIX APLICADO!")
print("=" * 60)
print(f"Arquivo: {ARQ}")
print()
print("LOGICA:")
print("  Se inputs.perda === false (sem historico de perda/sangria):")
print("    - 'NOVA DOAÇÃO'  -> 'DOAÇÃO'")
print("    - 'NOVA DOACAO'  -> 'DOAÇÃO'")
print("    - 'nova doação'  -> 'doação'")
print("    - 'NOVA SANGRIA' -> 'SANGRIA'")
print("    - 'nova sangria' -> 'sangria'")
print()
print("  Se inputs.perda === true (tem historico): texto mantido com 'NOVA'")
print()
print("Cobertura: 69 ocorrencias em ambas as matrizes")
print()
print("Teste de regressao:")
print("  1. Paciente SEM flag 'perda', Hb 12.1, Ferr baixa")
print("     -> texto: 'NAO FACA DOAÇÃO DE SANGUE...' (sem NOVA)")
print("  2. Paciente COM flag 'perda' (doadora), mesmos labs")
print("     -> texto: 'NAO FACA NOVA DOAÇÃO DE SANGUE...' (com NOVA)")
print()
print("Proximo passo:")
print('  git add . && git commit -m "fix: remove palavra NOVA quando nao ha historico de perda" && git push origin main')
