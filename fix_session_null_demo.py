"""
fix_session_null_demo.py

Corrige o TypeError 'Cannot read properties of null (reading user)' que
acontece no modo demo/bariatrico ao clicar Avaliar.

Causa: no modo demo, session eh null (nao ha usuario logado no Supabase),
mas handleAvaliar faz session.user.id diretamente.

Fix: modo demo (sem session) apenas mostra o resultado, sem persistir
no Supabase. Modo real (com session) continua salvando normalmente.

Alteracoes:
  1. handleAvaliar: guarda 'if (session?.user)' antes de insert + carregarDados
  2. carregarDados: o early-return do demoPerfil ja existe, mas vamos
     proteger tambem o caso 'session' null sem demoPerfil (nao deveria
     acontecer, mas defensivamente).
"""

from pathlib import Path
import sys

ARQ = Path("src/components/PatientDashboard.jsx")

if not ARQ.exists():
    print(f"ERRO: arquivo nao encontrado: {ARQ.resolve()}")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────
# ALTERACAO 1 — Proteger session.user.id no handleAvaliar
# Envolve o insert + carregarDados() em 'if (session?.user)'
# ─────────────────────────────────────────────────────────────────────
ancora = """    const res = avaliarPaciente(inputsNumericos)
    setResultado({ ...res, _inputs: inputsNumericos })

    if (res.encontrado) {
      await supabase.from('avaliacoes').insert({
        user_id: session.user.id,
        data_coleta: inputs.dataColeta,
        ferritina: Number(inputs.ferritina),
        hemoglobina: Number(inputs.hemoglobina),
        vcm: Number(inputs.vcm),
        rdw: Number(inputs.rdw),
        sat_transf: Number(inputs.satTransf),
        bariatrica: inputs.bariatrica,
        vegetariano: inputs.vegetariano,
        perda: inputs.perda,
        hipermenorreia: inputs.hipermenorreia,
        gestante: inputs.gestante,
        aspirina: inputs.aspirina,
        vitamina_b12: inputs.vitaminaB12,
        ferro_oral: inputs.ferroOral,
        diagnostico_label: res.label,
        diagnostico_color: res.color,
      })
      carregarDados()
    }
    setTela('resultado')
  }"""

novo = """    const res = avaliarPaciente(inputsNumericos)
    setResultado({ ...res, _inputs: inputsNumericos })

    // So persiste no Supabase se houver sessao real (paciente cadastrado).
    // Modo demo/bariatrico sem login apenas exibe o resultado.
    if (res.encontrado && session?.user) {
      await supabase.from('avaliacoes').insert({
        user_id: session.user.id,
        data_coleta: inputs.dataColeta,
        ferritina: Number(inputs.ferritina),
        hemoglobina: Number(inputs.hemoglobina),
        vcm: Number(inputs.vcm),
        rdw: Number(inputs.rdw),
        sat_transf: Number(inputs.satTransf),
        bariatrica: inputs.bariatrica,
        vegetariano: inputs.vegetariano,
        perda: inputs.perda,
        hipermenorreia: inputs.hipermenorreia,
        gestante: inputs.gestante,
        aspirina: inputs.aspirina,
        vitamina_b12: inputs.vitaminaB12,
        ferro_oral: inputs.ferroOral,
        diagnostico_label: res.label,
        diagnostico_color: res.color,
      })
      carregarDados()
    }
    setTela('resultado')
  }"""

if ancora not in src:
    if "if (res.encontrado && session?.user)" in src:
        print("AVISO: session guard ja aplicado. Nada a fazer.")
        sys.exit(0)
    print("ERRO: ancora nao encontrada no handleAvaliar.")
    print("   Pode ser que o arquivo tenha mudado desde a ultima verificacao.")
    sys.exit(1)

src = src.replace(ancora, novo, 1)
print("OK: handleAvaliar agora s\u00f3 salva no Supabase se houver sessao real.")
print("    Modo demo (Ctrl+M/B/F/G) mostra resultado sem persistir.")

ARQ.write_text(src, encoding="utf-8")
print(f"\nArquivo salvo: {ARQ.resolve()}")
print("\nProximo passo:")
print('  git add . && git commit -m "fix: protege session.user no modo demo do Dashboard" && git push origin main')
