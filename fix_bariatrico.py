"""
fix_bariatrico.py

Corrige 2 bugs no PatientDashboard.jsx que travavam o botao Avaliar:

BUG 1 — avaliarPaciente is not defined (ReferenceError no console)
  Fix: adiciona import de avaliarPaciente do decisionEngine.

BUG 2 — handleAvaliar ignora inputs.sexo/inputs.idade
  Fix: fallback — se profile nao tem sexo/data_nascimento,
  usa inputs.sexo/inputs.idade (preenchidos por Ctrl+M/B/F/G).
  Se nem um nem outro, alerta amigavel em vez de quebrar silencioso.
"""

from pathlib import Path
import sys

ARQ = Path("src/components/PatientDashboard.jsx")

if not ARQ.exists():
    print(f"ERRO: arquivo nao encontrado: {ARQ.resolve()}")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ─── ALTERACAO 1 — import de avaliarPaciente ──────────────────────────
ancora_1 = """import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ResultCard from './ResultCard'
import OBAModal from './OBAModal'
import heroImg from '../assets/redfairy-hero.png'
import logo from '../assets/logo.png'"""

novo_1 = """import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { avaliarPaciente } from '../engine/decisionEngine'
import ResultCard from './ResultCard'
import OBAModal from './OBAModal'
import heroImg from '../assets/redfairy-hero.png'
import logo from '../assets/logo.png'"""

if ancora_1 not in src:
    if "import { avaliarPaciente } from '../engine/decisionEngine'" in src:
        print("AVISO: import avaliarPaciente ja existe. Pulando alteracao 1.")
    else:
        print("ERRO: ancora 1 nao encontrada (bloco de imports).")
        sys.exit(1)
else:
    src = src.replace(ancora_1, novo_1, 1)
    print("OK alteracao 1: import avaliarPaciente adicionado.")

# ─── ALTERACAO 2 — fallback no handleAvaliar ──────────────────────────
ancora_2 = """  async function handleAvaliar() {
     if (!profile) return 
    const idade = calcularIdade(profile.data_nascimento)
    const inputsNumericos = {
      ...inputs,
      cpf: profile.cpf || '',
      sexo: profile.sexo,
      idade,
      ferritina: Number(inputs.ferritina),
      hemoglobina: Number(inputs.hemoglobina),
      vcm: Number(inputs.vcm),
      rdw: Number(inputs.rdw),
      satTransf: Number(inputs.satTransf),
    }
    const res = avaliarPaciente(inputsNumericos)"""

novo_2 = """  async function handleAvaliar() {
    if (!profile) return

    // Fallback sexo: profile primeiro, depois inputs (demo/bariatrico)
    const sexoFinal = profile.sexo || inputs.sexo || ''
    // Fallback idade: calculada do profile, depois inputs.idade
    const idadeFinal = profile.data_nascimento
      ? calcularIdade(profile.data_nascimento)
      : (inputs.idade ? Number(inputs.idade) : null)

    if (!sexoFinal || !idadeFinal) {
      alert('Antes de avaliar, use um dos atalhos: Ctrl+M (masc 20a), Ctrl+B (masc 50a), Ctrl+F (fem 20a), Ctrl+G (fem 50a) para definir sexo e idade.')
      return
    }

    if (!inputs.ferritina || !inputs.hemoglobina || !inputs.vcm || !inputs.rdw || !inputs.satTransf) {
      alert('Preencha todos os campos laboratoriais: Ferritina, Hemoglobina, VCM, RDW e Sat. Transferrina.')
      return
    }
    if (!inputs.dataColeta) {
      alert('Informe a data da coleta.')
      return
    }

    const inputsNumericos = {
      ...inputs,
      cpf: profile.cpf || '',
      sexo: sexoFinal,
      idade: idadeFinal,
      ferritina: Number(inputs.ferritina),
      hemoglobina: Number(inputs.hemoglobina),
      vcm: Number(inputs.vcm),
      rdw: Number(inputs.rdw),
      satTransf: Number(inputs.satTransf),
    }
    const res = avaliarPaciente(inputsNumericos)"""

if ancora_2 not in src:
    if "sexoFinal = profile.sexo || inputs.sexo" in src:
        print("AVISO: fallback sexo/idade ja existe. Pulando alteracao 2.")
    else:
        print("ERRO: ancora 2 nao encontrada (handleAvaliar).")
        sys.exit(1)
else:
    src = src.replace(ancora_2, novo_2, 1)
    print("OK alteracao 2: fallback sexo/idade + validacoes adicionadas.")

ARQ.write_text(src, encoding="utf-8")
print(f"\nArquivo salvo: {ARQ.resolve()}")
print("\nProximo passo:")
print('  git add . && git commit -m "fix: bariatrico - import avaliarPaciente + fallback sexo/idade" && git push origin main')
