"""
fix_hb_alvo_gestante.py

Fix clinico: na gestacao, a Hb alvo e 11.5 g/dL (nao 12.5), devido
a hemodilucao fisiologica. A OMS define anemia gestacional como
Hb < 11.0 g/dL. O alvo terapeutico 11.5 e apropriado.

3 alteracoes em src/components/ResultCard.jsx:

  FIX 1 — calcularFerroEV aceita parametro 'gestante':
    hbAlvo = sexo === 'M' ? 14.0 : (gestante ? 11.5 : 12.5)

  FIX 2 — ModalFerroEV propaga gestante como prop para calcularFerroEV

  FIX 3 — precisaFerroEV usa _gestanteFerroEV na guarda de deficit

  FIX 4 — Render de <ModalFerroEV> passa gestante={resultado._inputs?.gestante}
"""

from pathlib import Path
import sys

ARQ = Path("src/components/ResultCard.jsx")
if not ARQ.exists():
    print(f"ERRO: {ARQ} nao existe.")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# FIX 1 — calcularFerroEV aceita 'gestante'
# ═════════════════════════════════════════════════════════════════════
ancora_fix1 = """function calcularFerroEV(hbAtual, sexo) {
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

novo_fix1 = """function calcularFerroEV(hbAtual, sexo, gestante) {
  const pesoReferencia = 70;
  // Na gestacao a Hb alvo e 11.5 (hemodilucao fisiologica, OMS)
  const hbAlvo = sexo === 'M' ? 14.0 : (gestante ? 11.5 : 12.5);
  const deficit = Math.max(hbAlvo - hbAtual, 0);
  // FIX: se deficit = 0, dose = 0 (sem o +500 de reserva espuria)
  const doseTotal = deficit > 0
    ? Math.round((pesoReferencia * deficit * 2.4 + 500) / 100) * 100
    : 0;
  const sessoes = doseTotal > 0 ? Math.ceil(doseTotal / 200) : 0;
  return { doseTotal, sessoes, hbAlvo, deficit: deficit.toFixed(1) };
}"""

if "function calcularFerroEV(hbAtual, sexo, gestante)" in src:
    print("AVISO 1: calcularFerroEV ja aceita gestante.")
elif ancora_fix1 in src:
    src = src.replace(ancora_fix1, novo_fix1, 1)
    print("OK 1: calcularFerroEV agora aceita parametro 'gestante'.")
else:
    print("ERRO 1: ancora calcularFerroEV nao encontrada (pode nao ter o fix anterior aplicado).")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
# FIX 2 — ModalFerroEV propaga a prop
# ═════════════════════════════════════════════════════════════════════
ancora_fix2 = """function ModalFerroEV({ onClose, hbAtual, sexo }) {
  const { doseTotal, sessoes, hbAlvo, deficit } = calcularFerroEV(hbAtual, sexo);"""

novo_fix2 = """function ModalFerroEV({ onClose, hbAtual, sexo, gestante }) {
  const { doseTotal, sessoes, hbAlvo, deficit } = calcularFerroEV(hbAtual, sexo, gestante);"""

if "function ModalFerroEV({ onClose, hbAtual, sexo, gestante })" in src:
    print("AVISO 2: ModalFerroEV ja aceita gestante.")
elif ancora_fix2 in src:
    src = src.replace(ancora_fix2, novo_fix2, 1)
    print("OK 2: ModalFerroEV propaga 'gestante' para calcularFerroEV.")
else:
    print("ERRO 2: ancora ModalFerroEV nao encontrada.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
# FIX 3 — precisaFerroEV guard agora considera gestante
# ═════════════════════════════════════════════════════════════════════
ancora_fix3 = """  // FIX: guards contra disparo espurio em paciente verde ou sem deficit real de Hb
  const _hbAtualFerroEV = Number(resultado._inputs?.hemoglobina ?? 0);
  const _sexoFerroEV = resultado._inputs?.sexo || 'M';
  const _hbAlvoFerroEV = _sexoFerroEV === 'M' ? 14.0 : 12.5;
  const _deficitHbFerroEV = Math.max(_hbAlvoFerroEV - _hbAtualFerroEV, 0);
  const _bloqueioVerde = resultado.color === 'green';"""

novo_fix3 = """  // FIX: guards contra disparo espurio em paciente verde ou sem deficit real de Hb
  // Consideramos gestante (Hb alvo gestacional = 11.5 g/dL por hemodilucao fisiologica)
  const _hbAtualFerroEV = Number(resultado._inputs?.hemoglobina ?? 0);
  const _sexoFerroEV = resultado._inputs?.sexo || 'M';
  const _gestanteFerroEV = Boolean(resultado._inputs?.gestante);
  const _hbAlvoFerroEV = _sexoFerroEV === 'M' ? 14.0 : (_gestanteFerroEV ? 11.5 : 12.5);
  const _deficitHbFerroEV = Math.max(_hbAlvoFerroEV - _hbAtualFerroEV, 0);
  const _bloqueioVerde = resultado.color === 'green';"""

if "_gestanteFerroEV" in src:
    print("AVISO 3: guard ja considera gestante.")
elif ancora_fix3 in src:
    src = src.replace(ancora_fix3, novo_fix3, 1)
    print("OK 3: guard de precisaFerroEV agora considera gestante.")
else:
    print("ERRO 3: ancora da guard nao encontrada.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
# FIX 4 — Render de <ModalFerroEV> passa prop gestante
# ═════════════════════════════════════════════════════════════════════
ancora_fix4 = "{showFerroEV && <ModalFerroEV onClose={() => setShowFerroEV(false)} hbAtual={hbAtual} sexo={sexo} />}"
novo_fix4   = "{showFerroEV && <ModalFerroEV onClose={() => setShowFerroEV(false)} hbAtual={hbAtual} sexo={sexo} gestante={resultado._inputs?.gestante} />}"

if "gestante={resultado._inputs?.gestante}" in src:
    print("AVISO 4: render ja passa a prop gestante.")
elif ancora_fix4 in src:
    src = src.replace(ancora_fix4, novo_fix4, 1)
    print("OK 4: render <ModalFerroEV> agora passa gestante.")
else:
    print("ERRO 4: ancora do render do ModalFerroEV nao encontrada.")
    sys.exit(1)

ARQ.write_text(src, encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("FIX APLICADO!")
print("=" * 60)
print(f"Arquivo: {ARQ}")
print()
print("REGRA CLINICA CORRIGIDA:")
print("  - Homem:            Hb alvo = 14.0 g/dL")
print("  - Mulher nao-gest.: Hb alvo = 12.5 g/dL")
print("  - Gestante:         Hb alvo = 11.5 g/dL  <-- NOVO")
print()
print("JUSTIFICATIVA: Hemodilucao fisiologica na gestacao")
print("  OMS: anemia gestacional = Hb < 11.0 g/dL")
print("  Alvo 11.5 e adequado (pouco acima do limite de normalidade)")
print()
print("Teste sugerido:")
print("  Gestante, Hb 11.8, diagnostico ferropriva")
print("  -> Antes: deficit 0.7 g/dL -> dose EV calculada")
print("  -> Agora: deficit 0.0 (Hb 11.8 >= alvo 11.5) -> botao nao aparece")
print()
print("  Gestante, Hb 10.5, diagnostico ferropriva")
print("  -> deficit 1.0 g/dL -> dose EV adequada (~668 mg)")
print()
print("Proximo passo:")
print('  git add . && git commit -m "fix: Hb alvo 11.5 em gestantes (formula Ganzoni)" && git push origin main')
