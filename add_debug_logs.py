"""
add_debug_logs.py

Adiciona console.logs temporarios no handleAvaliar do PatientDashboard
para descobrir onde o sexo se perde no fluxo Sou Paciente / Sou Bariatrico.

Depois de identificar e corrigir, removemos esses logs.
"""

from pathlib import Path
import sys

ARQ = Path("src/components/PatientDashboard.jsx")

if not ARQ.exists():
    print(f"ERRO: arquivo nao encontrado: {ARQ.resolve()}")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# Idempotencia
if "console.log('[RF DEBUG]" in src:
    print("AVISO: logs de debug ja existem. Pulando.")
    sys.exit(0)

# ─── Inserir logs no inicio do handleAvaliar ──────────────────────────
ancora = """  async function handleAvaliar() {
    if (!profile) return

    // Fallback sexo: profile primeiro, depois inputs (demo/bariatrico)
    const sexoFinal = profile.sexo || inputs.sexo || ''"""

novo = """  async function handleAvaliar() {
    console.log('[RF DEBUG] === handleAvaliar chamado ===')
    console.log('[RF DEBUG] profile:', profile)
    console.log('[RF DEBUG] profile.sexo:', profile?.sexo)
    console.log('[RF DEBUG] profile.data_nascimento:', profile?.data_nascimento)
    console.log('[RF DEBUG] inputs.sexo:', inputs.sexo)
    console.log('[RF DEBUG] inputs.idade:', inputs.idade)
    console.log('[RF DEBUG] inputs completo:', inputs)

    if (!profile) return

    // Fallback sexo: profile primeiro, depois inputs (demo/bariatrico)
    const sexoFinal = profile.sexo || inputs.sexo || ''"""

if ancora not in src:
    print("ERRO: ancora nao encontrada. Verifique se o fix anterior foi aplicado.")
    sys.exit(1)

src = src.replace(ancora, novo, 1)

# ─── Tambem logar o resultado de sexoFinal e idadeFinal ───────────────
ancora_2 = """    if (!sexoFinal || !idadeFinal) {
      alert('Antes de avaliar, use um dos atalhos: Ctrl+M (masc 20a), Ctrl+B (masc 50a), Ctrl+F (fem 20a), Ctrl+G (fem 50a) para definir sexo e idade.')
      return
    }"""

novo_2 = """    console.log('[RF DEBUG] sexoFinal calculado:', sexoFinal)
    console.log('[RF DEBUG] idadeFinal calculada:', idadeFinal)

    if (!sexoFinal || !idadeFinal) {
      console.log('[RF DEBUG] ABORTANDO: sexo ou idade invalidos')
      alert('Antes de avaliar, use um dos atalhos: Ctrl+M (masc 20a), Ctrl+B (masc 50a), Ctrl+F (fem 20a), Ctrl+G (fem 50a) para definir sexo e idade.')
      return
    }"""

if ancora_2 in src:
    src = src.replace(ancora_2, novo_2, 1)
    print("OK: logs de debug adicionados no handleAvaliar.")
else:
    print("AVISO: ancora 2 nao encontrada, logs parciais aplicados.")

ARQ.write_text(src, encoding="utf-8")
print(f"\nArquivo salvo: {ARQ.resolve()}")
print("\nProximo passo:")
print('  git add . && git commit -m "debug: logs temporarios em handleAvaliar" && git push origin main')
print("\nDepois do deploy, F12 > Console > tente Avaliar e me cole TODAS as linhas [RF DEBUG] que aparecerem.")
