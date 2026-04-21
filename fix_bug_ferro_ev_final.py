"""
fix_bug_ferro_ev_final.py

Fix DEFINITIVO do bug do Protocolo de Ferro Endovenoso
(reportado pelo Dr. Ramos com caso: F, Hb 13.7, BARIATRICA COM
SUPORTE ADEQUADO, deficit 0.0 -> aparecia 500 mg).

2 correcoes em src/components/ResultCard.jsx:

  FIX 1 — Formula de Ganzoni (linha 33-40):
    Se deficit = 0, dose total = 0 (sem os +500 de reserva espuria).

  FIX 2 — Guard de precisaFerroEV (linha 889-895):
    Adiciona 2 condicoes bloqueadoras:
      (a) NAO dispara se resultado.color === 'green'
      (b) NAO dispara se deficit Hb <= 0 (safety net)

Os nomes das propriedades foram confirmados pelo diagnostico:
  - resultado.color     (ja usado em linhas 492, 887)
  - resultado._inputs?.sexo        (ja usado em linha 493)
  - resultado._inputs?.hemoglobina (mesmo padrao)
"""

from pathlib import Path
import sys

ARQ = Path("src/components/ResultCard.jsx")
if not ARQ.exists():
    print(f"ERRO: {ARQ} nao existe.")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# FIX 1 — Formula de Ganzoni
# ═════════════════════════════════════════════════════════════════════
ancora_fix1 = """function calcularFerroEV(hbAtual, sexo) {
  const pesoReferencia = 70;
  const hbAlvo = sexo === 'M' ? 14.0 : 12.5;
  const deficit = Math.max(hbAlvo - hbAtual, 0);
  const doseTotal = Math.round((pesoReferencia * deficit * 2.4 + 500) / 100) * 100;
  const sessoes = Math.ceil(doseTotal / 200);
  return { doseTotal, sessoes, hbAlvo, deficit: deficit.toFixed(1) };
}"""

novo_fix1 = """function calcularFerroEV(hbAtual, sexo) {
  const pesoReferencia = 70;
  const hbAlvo = sexo === 'M' ? 14.0 : 12.5;
  const deficit = Math.max(hbAlvo - hbAtual, 0);
  // FIX: se deficit = 0, dose = 0 (sem o +500 de reserva espuria)
  const doseTotal = deficit > 0
    ? Math.round((pesoReferencia * deficit * 2.4 + 500) / 100) * 100
    : 0;
  const sessoes = doseTotal > 0 ? Math.ceil(doseTotal / 200) : 0;
  return { doseTotal, sessoes, hbAlvo, deficit: deficit.toFixed(1) };
}"""

if "deficit > 0" in src and "const doseTotal = deficit > 0" in src:
    print("AVISO 1: formula de Ganzoni ja corrigida.")
elif ancora_fix1 in src:
    src = src.replace(ancora_fix1, novo_fix1, 1)
    print("OK 1: formula de Ganzoni corrigida (deficit 0 -> dose 0).")
else:
    print("ERRO 1: ancora da funcao calcularFerroEV nao encontrada.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
# FIX 2 — Guard de precisaFerroEV
# ═════════════════════════════════════════════════════════════════════
ancora_fix2 = """  const precisaFerroEV =
    resultado.diagnostico?.toUpperCase().includes('ENDOVENOSA') ||
    resultado.diagnostico?.toUpperCase().includes('INTRAVENOSA') ||
    resultado.diagnostico?.toUpperCase().includes('FERRO ENDOVENOSO') ||
    resultado.recomendacao?.toUpperCase().includes('ENDOVENOSA') ||
    resultado.recomendacao?.toUpperCase().includes('INTRAVENOSA') ||
    resultado.recomendacao?.toUpperCase().includes('FERRO ENDOVENOSO');"""

novo_fix2 = """  // FIX: guards contra disparo espurio em paciente verde ou sem deficit real de Hb
  const _hbAtualFerroEV = Number(resultado._inputs?.hemoglobina ?? 0);
  const _sexoFerroEV = resultado._inputs?.sexo || 'M';
  const _hbAlvoFerroEV = _sexoFerroEV === 'M' ? 14.0 : 12.5;
  const _deficitHbFerroEV = Math.max(_hbAlvoFerroEV - _hbAtualFerroEV, 0);
  const _bloqueioVerde = resultado.color === 'green';

  const precisaFerroEV =
    !_bloqueioVerde && _deficitHbFerroEV > 0 && (
      resultado.diagnostico?.toUpperCase().includes('ENDOVENOSA') ||
      resultado.diagnostico?.toUpperCase().includes('INTRAVENOSA') ||
      resultado.diagnostico?.toUpperCase().includes('FERRO ENDOVENOSO') ||
      resultado.recomendacao?.toUpperCase().includes('ENDOVENOSA') ||
      resultado.recomendacao?.toUpperCase().includes('INTRAVENOSA') ||
      resultado.recomendacao?.toUpperCase().includes('FERRO ENDOVENOSO')
    );"""

if "_bloqueioVerde" in src:
    print("AVISO 2: guard do precisaFerroEV ja aplicada.")
elif ancora_fix2 in src:
    src = src.replace(ancora_fix2, novo_fix2, 1)
    print("OK 2: guard aplicada em precisaFerroEV (bloqueia se verde OU deficit <= 0).")
else:
    print("ERRO 2: ancora da expressao precisaFerroEV nao encontrada.")
    sys.exit(1)

ARQ.write_text(src, encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("FIX APLICADO!")
print("=" * 60)
print(f"Arquivo modificado: {ARQ}")
print()
print("CORRECOES:")
print("  FIX 1: Formula de Ganzoni deixa de somar +500 se deficit = 0")
print("  FIX 2: Botao 'Como repor Ferro EV' so aparece se:")
print("         - resultado.color != 'green'  E")
print("         - deficit Hb > 0  E")
print("         - texto menciona ENDOVENOSA/INTRAVENOSA/FERRO ENDOVENOSO")
print()
print("Caso do Dr. Ramos (reteste):")
print("  F, Hb 13.7, diagnostico BARIATRICA COM SUPORTE ADEQUADO (verde)")
print("  -> Antes: botao aparecia + modal mostrava 500 mg")
print("  -> Agora: botao NAO aparece (bloqueio verde + deficit 0)")
print()
print("Proximo passo:")
print('  git add . && git commit -m "fix: ferro EV bloqueado em verde/sem deficit" && git push origin main')
