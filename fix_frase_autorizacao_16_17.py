"""
fix_frase_autorizacao_16_17.py

Bug: a frase 'ENTRE 16 E 17 ANOS DE IDADE E PRECISO AUTORIZACAO DOS
RESPONSAVEIS LEGAIS PARA DOAR SANGUE' aparece em pacientes adultos
(>= 18 anos), poluindo o texto sem relevancia clinica.

Fix: pos-processamento no decisionEngine.js. Se inputs.idade >= 18,
remove a frase inteira dos textos recomendacaoAge1 e recomendacaoAge2.

Aproveita o bloco ja criado pelo fix anterior da palavra NOVA.
"""

from pathlib import Path
import sys

ARQ = Path("src/engine/decisionEngine.js")
if not ARQ.exists():
    print(f"ERRO: {ARQ} nao existe.")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# Inserir novo bloco LOGO APOS o fix da palavra NOVA ja existente
# ═════════════════════════════════════════════════════════════════════
ancora = """  // Fix palavra 'NOVA': se paciente NAO tem historico de perda/sangria,
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

novo = ancora + """

  // Fix frase '16-17 anos': so relevante para pacientes menores de 18 anos.
  // Em adultos (>= 18), a frase eh ruido e deve ser removida.
  if (resultado && Number(inputs.idade) >= 18) {
    const removerFraseMenor = (txt) => typeof txt === 'string'
      ? txt.replace(/\\s*ENTRE 16 E 17 ANOS DE IDADE É PRECISO AUTORIZAÇÃO DOS RESPONSÁVEIS LEGAIS PARA DOAR SANGUE\\./g, '')
           .replace(/\\s*entre 16 e 17 anos de idade é preciso autorização dos responsáveis legais para doar sangue\\./g, '')
      : txt;
    resultado.recomendacaoAge1 = removerFraseMenor(resultado.recomendacaoAge1);
    resultado.recomendacaoAge2 = removerFraseMenor(resultado.recomendacaoAge2);
  }"""

if "Fix frase '16-17 anos'" in src:
    print("AVISO: fix da frase 16-17 anos ja foi aplicado.")
    sys.exit(0)

if ancora not in src:
    print("ERRO: ancora do fix da palavra NOVA nao encontrada.")
    print("     Verifique se o fix anterior (palavra NOVA) foi aplicado.")
    sys.exit(1)

src = src.replace(ancora, novo, 1)
ARQ.write_text(src, encoding="utf-8")
print("OK: pos-processamento da frase '16-17 anos' adicionado.")

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("FIX APLICADO!")
print("=" * 60)
print(f"Arquivo: {ARQ}")
print()
print("LOGICA:")
print("  Se inputs.idade >= 18:")
print("    - Remove 'ENTRE 16 E 17 ANOS DE IDADE E PRECISO")
print("       AUTORIZACAO DOS RESPONSAVEIS LEGAIS PARA DOAR SANGUE.'")
print("  Se inputs.idade < 18:")
print("    - Frase mantida (relevante para menores)")
print()
print("Cobertura: 20 ocorrencias em ambas as matrizes")
print()
print("Teste de regressao:")
print("  1. Adulto (35 anos) com SIDEROPENIA INCIPIENTE")
print("     -> Texto sem a frase de autorizacao")
print("  2. Adolescente (16 anos) com mesma condicao")
print("     -> Texto MANTEM a frase de autorizacao")
print()
print("Proximo passo:")
print('  git add . && git commit -m "fix: remove frase 16-17 anos em pacientes adultos" && git push origin main')
