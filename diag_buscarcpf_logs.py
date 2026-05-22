# -*- coding: utf-8 -*-
"""
diag_buscarcpf_logs.py  (TriagemModal.jsx)

DIAGNOSTICO TEMPORARIO. Insere console.log em buscarCpfConhecido
para revelar, no refluxo de reavaliacao:
- se a funcao e chamada e com qual cpfDigits
- o que profiles retorna
- o que o count de triagens retorna
- qual ramo seta pacienteConhecido

NAO altera logica. Reversivel: depois rodamos o de-undo ou git checkout.
Marker: __DIAG_BUSCACPF__
"""
import shutil
from pathlib import Path

ARQ = Path("src/components/TriagemModal.jsx")
BAK = Path("src/components/TriagemModal.jsx.bak_pre_diag")

if not ARQ.exists():
    raise SystemExit("ERRO: TriagemModal.jsx nao encontrado.")
src = ARQ.read_text(encoding="utf-8")
if "__DIAG_BUSCACPF__" in src:
    raise SystemExit("-- diag ja aplicado.")
if not BAK.exists():
    shutil.copy2(ARQ, BAK)
    print("OK backup ->", BAK)

# 1. Log no inicio da funcao
old1 = """  async function buscarCpfConhecido(cpfDigits) {
    setBuscandoCpf(true);"""
new1 = """  async function buscarCpfConhecido(cpfDigits) {
    console.log('__DIAG__ buscarCpfConhecido chamada cpfDigits=', cpfDigits);
    setBuscandoCpf(true);"""
if old1 in src:
    src = src.replace(old1, new1, 1)
    print("OK log 1 (entrada)")
else:
    print("AVISO log 1 nao bateu")

# 2. Log apos consultas (profile + count)
old2 = """    setBuscandoCpf(false);
    if (!profile && (nTriagens || 0) >= 3) {"""
new2 = """    setBuscandoCpf(false);
    console.log('__DIAG__ profile=', profile, ' nTriagens=', nTriagens);
    if (!profile && (nTriagens || 0) >= 3) {"""
if old2 in src:
    src = src.replace(old2, new2, 1)
    print("OK log 2 (resultado profile/nTriagens)")
else:
    print("AVISO log 2 nao bateu")

# 3. Log no ramo origem triagem
old3 = """      if (triagem) {
        setPacienteConhecido({
          origem: 'triagem',"""
new3 = """      if (triagem) {
        console.log('__DIAG__ setando pacienteConhecido origem triagem:', triagem);
        setPacienteConhecido({
          origem: 'triagem',"""
if old3 in src:
    src = src.replace(old3, new3, 1)
    print("OK log 3 (ramo triagem)")
else:
    print("AVISO log 3 nao bateu")

# 4. Log no setPacienteConhecido(null) final
old4 = """      }
    }
    setPacienteConhecido(null);
  }"""
new4 = """      }
    }
    console.log('__DIAG__ caiu no setPacienteConhecido(null) FINAL');
    setPacienteConhecido(null);
  }"""
if old4 in src:
    src = src.replace(old4, new4, 1)
    print("OK log 4 (null final)")
else:
    print("AVISO log 4 nao bateu")

# marker
src = src.replace("async function buscarCpfConhecido(cpfDigits) {",
                  "async function buscarCpfConhecido(cpfDigits) { /* __DIAG_BUSCACPF__ */", 1)

ARQ.write_text(src, encoding="utf-8")
print("\nOK diagnostico inserido. Proximo: npm run build, testar, ver Console (F12)")
print("Procure linhas que comecam com __DIAG__ no Console durante a reavaliacao.")
