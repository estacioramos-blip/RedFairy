"""
fase1_completa.py

FASE 1 COMPLETA — Propagacao de dados de gestacao da RedFairy para OBAModal.

7 alteracoes em 3 arquivos:

  Calculator.jsx
    1a. State: semanas_gestacao + dum
    1b. Supabase insert: salvar ambos
    1c. Renderizar inputs apos o checkbox Gestante
    1d. Passar dadosRedFairy como prop para OBAModal

  PatientDashboard.jsx
    2a. State: semanas_gestacao + dum
    2b. Supabase insert: salvar ambos
    2c. Renderizar inputs apos grid de historico clinico
    2d. Passar dadosRedFairy como prop para OBAModal

  OBAModal.jsx
    3a. Assinatura: aceitar prop dadosRedFairy
    3b. useEffect que pre-preenche Status Gestacional se vier da RedFairy
    3c. Import de useEffect (se nao existir)

SQL PARA SUPABASE (manual) no final do output.
"""

from pathlib import Path
import sys

# ═════════════════════════════════════════════════════════════════════
# ARQUIVO 1: Calculator.jsx
# ═════════════════════════════════════════════════════════════════════
CALC = Path("src/components/Calculator.jsx")
if not CALC.exists():
    print(f"ERRO: {CALC} nao existe.")
    sys.exit(1)

calc_src = CALC.read_text(encoding="utf-8")

# --- 1a: state inputs ---
ancora_1a = "    hipermenorreia: false, gestante: false, alcoolista: false,"
novo_1a   = "    hipermenorreia: false, gestante: false, semanas_gestacao: '', dum: '', alcoolista: false,"

if "semanas_gestacao: ''," in calc_src:
    print("AVISO 1a: state ja tem semanas_gestacao em Calculator.")
elif ancora_1a in calc_src:
    calc_src = calc_src.replace(ancora_1a, novo_1a, 1)
    print("OK 1a: state Calculator recebe semanas_gestacao e dum.")
else:
    print("ERRO 1a: ancora do state em Calculator nao encontrada.")
    sys.exit(1)

# --- 1b: insert Supabase ---
ancora_1b = """        gestante: inputs.gestante,
        aspirina: inputs.aspirina,"""
novo_1b = """        gestante: inputs.gestante,
        semanas_gestacao: inputs.gestante && inputs.semanas_gestacao ? Number(inputs.semanas_gestacao) : null,
        dum: inputs.gestante && inputs.dum ? inputs.dum : null,
        aspirina: inputs.aspirina,"""

if "semanas_gestacao: inputs.gestante" in calc_src:
    print("AVISO 1b: persistencia ja existe em Calculator.")
elif ancora_1b in calc_src:
    calc_src = calc_src.replace(ancora_1b, novo_1b, 1)
    print("OK 1b: persistencia Calculator (semanas_gestacao + dum).")
else:
    print("ERRO 1b: ancora do insert em Calculator nao encontrada.")
    sys.exit(1)

# --- 1c: inputs visuais apos checkbox Gestante ---
ancora_1c = """                  <CheckboxCard name="hipermenorreia" label="Hipermenorreia" sublabel="Fluxo excessivo" checked={inputs.hipermenorreia} onChange={handleChange} color="pink" />
                  <CheckboxCard name="gestante" label="Gestante" sublabel="Gravidez atual" checked={inputs.gestante} onChange={handleChange} color="pink" />
                </>"""

novo_1c = """                  <CheckboxCard name="hipermenorreia" label="Hipermenorreia" sublabel="Fluxo excessivo" checked={inputs.hipermenorreia} onChange={handleChange} color="pink" />
                  <CheckboxCard name="gestante" label="Gestante" sublabel="Gravidez atual" checked={inputs.gestante} onChange={handleChange} color="pink" />
                </>"""

# Encontrar onde fecha o bloco isFem (depois do </>) para inserir o bloco de gestacao
# Vamos inserir o bloco DEPOIS do fechamento </div> do grid histórico.
# Estratégia mais segura: localizar o fim do </>)} logo após gestante.
ancora_1c_alt = """                  <CheckboxCard name="gestante" label="Gestante" sublabel="Gravidez atual" checked={inputs.gestante} onChange={handleChange} color="pink" />
                </>
              )}
            </div>"""

novo_1c_alt = """                  <CheckboxCard name="gestante" label="Gestante" sublabel="Gravidez atual" checked={inputs.gestante} onChange={handleChange} color="pink" />
                </>
              )}
            </div>

            {/* Fase 1: dados de gestacao */}
            {inputs.gestante && inputs.sexo === 'F' && (
              <div className="mt-3 p-3 rounded-xl border border-pink-200 bg-pink-50">
                <p className="text-xs font-bold text-pink-700 uppercase tracking-wide mb-2">📋 Dados da Gestação</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Semanas de gestação <span className="text-red-500">*</span></label>
                    <input type="number" name="semanas_gestacao" value={inputs.semanas_gestacao} onChange={handleChange}
                      min="1" max="42" placeholder="Ex: 24"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">DUM <span className="text-gray-400 font-normal">(opcional)</span></label>
                    <input type="date" name="dum" value={inputs.dum} onChange={handleChange}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
                  </div>
                </div>
                {inputs.semanas_gestacao && inputs.dum && (() => {
                  const hoje = new Date()
                  const dumDate = new Date(inputs.dum)
                  const diasDesdeDUM = Math.floor((hoje - dumDate) / (1000 * 60 * 60 * 24))
                  const semanasCalc = diasDesdeDUM / 7
                  const diff = Math.abs(semanasCalc - Number(inputs.semanas_gestacao))
                  if (diff > 2) {
                    return <p className="text-xs text-orange-600 font-medium mt-2">⚠️ DUM sugere ~{semanasCalc.toFixed(1)} semanas, mas você informou {inputs.semanas_gestacao}. Revise os dados.</p>
                  }
                  return null
                })()}
              </div>
            )}"""

if "{/* Fase 1: dados de gestacao */}" in calc_src:
    print("AVISO 1c: inputs visuais ja existem em Calculator.")
elif ancora_1c_alt in calc_src:
    calc_src = calc_src.replace(ancora_1c_alt, novo_1c_alt, 1)
    print("OK 1c: inputs visuais semanas/DUM inseridos em Calculator.")
else:
    print("ERRO 1c: ancora do fim do bloco isFem em Calculator nao encontrada.")
    sys.exit(1)

# --- 1d: passar dadosRedFairy para <OBAModal> ---
ancora_1d = """          examesRedFairy={{
            ferritina: inputs.ferritina,
            hemoglobina: inputs.hemoglobina,
            vcm: inputs.vcm,
            rdw: inputs.rdw,
            satTransf: inputs.satTransf,
            dataColeta: inputs.dataColeta,
          }}"""

novo_1d = """          examesRedFairy={{
            ferritina: inputs.ferritina,
            hemoglobina: inputs.hemoglobina,
            vcm: inputs.vcm,
            rdw: inputs.rdw,
            satTransf: inputs.satTransf,
            dataColeta: inputs.dataColeta,
          }}
          dadosRedFairy={{
            gestante: inputs.gestante,
            semanas_gestacao: inputs.semanas_gestacao ? Number(inputs.semanas_gestacao) : null,
            dum: inputs.dum || null,
          }}"""

if "dadosRedFairy={{" in calc_src:
    print("AVISO 1d: dadosRedFairy ja e passado em Calculator.")
elif ancora_1d in calc_src:
    calc_src = calc_src.replace(ancora_1d, novo_1d, 1)
    print("OK 1d: dadosRedFairy passado ao OBAModal em Calculator.")
else:
    print("ERRO 1d: ancora do examesRedFairy em Calculator nao encontrada.")
    sys.exit(1)

CALC.write_text(calc_src, encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# ARQUIVO 2: PatientDashboard.jsx
# ═════════════════════════════════════════════════════════════════════
DASH = Path("src/components/PatientDashboard.jsx")
if not DASH.exists():
    print(f"ERRO: {DASH} nao existe.")
    sys.exit(1)

dash_src = DASH.read_text(encoding="utf-8")

# --- 2a: state ---
ancora_2a = "    hipermenorreia: false, gestante: false,"
novo_2a   = "    hipermenorreia: false, gestante: false, semanas_gestacao: '', dum: '',"

if "semanas_gestacao: ''," in dash_src:
    print("AVISO 2a: state ja tem semanas_gestacao em Dashboard.")
elif ancora_2a in dash_src:
    dash_src = dash_src.replace(ancora_2a, novo_2a, 1)
    print("OK 2a: state Dashboard recebe semanas_gestacao e dum.")
else:
    print("ERRO 2a: ancora do state em Dashboard nao encontrada.")
    sys.exit(1)

# --- 2b: insert Supabase ---
ancora_2b = """        gestante: inputs.gestante,
        aspirina: inputs.aspirina,"""
novo_2b = """        gestante: inputs.gestante,
        semanas_gestacao: inputs.gestante && inputs.semanas_gestacao ? Number(inputs.semanas_gestacao) : null,
        dum: inputs.gestante && inputs.dum ? inputs.dum : null,
        aspirina: inputs.aspirina,"""

if "semanas_gestacao: inputs.gestante" in dash_src:
    print("AVISO 2b: persistencia ja existe em Dashboard.")
elif ancora_2b in dash_src:
    dash_src = dash_src.replace(ancora_2b, novo_2b, 1)
    print("OK 2b: persistencia Dashboard (semanas_gestacao + dum).")
else:
    print("ERRO 2b: ancora do insert em Dashboard nao encontrada.")
    sys.exit(1)

# --- 2c: inputs visuais apos grid de historico ---
# Vamos colocar logo após o bloco que fecha o .map() dos checkboxes de historico.
# Estrategia: inserir apos o </div> que fecha o grid do Historico Clinico.
ancora_2c = """                ].map(f => (
                  <label key={f.name} className={`flex items-start gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm"""

# Localizar o idx e procurar o fechamento do </div> do grid
idx_2c = dash_src.find(ancora_2c)
if idx_2c < 0:
    print("ERRO 2c: ancora do map de flags em Dashboard nao encontrada.")
    sys.exit(1)

# Procurar o ))} e </div> apos o idx_2c
end_map = dash_src.find("))}", idx_2c)
if end_map < 0:
    print("ERRO 2c: fim do .map em Dashboard nao encontrado.")
    sys.exit(1)

end_div = dash_src.find("</div>", end_map) + len("</div>")

bloco_2c_novo = """

              {/* Fase 1: dados de gestacao */}
              {inputs.gestante && inputs.sexo === 'F' && (
                <div className="mt-3 p-3 rounded-xl border border-pink-200 bg-pink-50">
                  <p className="text-xs font-bold text-pink-700 uppercase tracking-wide mb-2">📋 Dados da Gestação</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Semanas de gestação <span className="text-red-500">*</span></label>
                      <input type="number" name="semanas_gestacao" value={inputs.semanas_gestacao} onChange={handleChange}
                        min="1" max="42" placeholder="Ex: 24"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">DUM <span className="text-gray-400 font-normal">(opcional)</span></label>
                      <input type="date" name="dum" value={inputs.dum} onChange={handleChange}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
                    </div>
                  </div>
                  {inputs.semanas_gestacao && inputs.dum && (() => {
                    const hoje = new Date()
                    const dumDate = new Date(inputs.dum)
                    const diasDesdeDUM = Math.floor((hoje - dumDate) / (1000 * 60 * 60 * 24))
                    const semanasCalc = diasDesdeDUM / 7
                    const diff = Math.abs(semanasCalc - Number(inputs.semanas_gestacao))
                    if (diff > 2) {
                      return <p className="text-xs text-orange-600 font-medium mt-2">⚠️ DUM sugere ~{semanasCalc.toFixed(1)} semanas, mas você informou {inputs.semanas_gestacao}. Revise os dados.</p>
                    }
                    return null
                  })()}
                </div>
              )}"""

if "{/* Fase 1: dados de gestacao */}" in dash_src:
    print("AVISO 2c: inputs visuais ja existem em Dashboard.")
else:
    dash_src = dash_src[:end_div] + bloco_2c_novo + dash_src[end_div:]
    print("OK 2c: inputs visuais semanas/DUM inseridos em Dashboard.")

# --- 2d: passar dadosRedFairy para <OBAModal> ---
ancora_2d = """        <OBAModal
          cpf={profile.cpf}
          sexo={profile.sexo}
          idade={profile.data_nascimento ? Math.floor((Date.now() - new Date(profile.data_nascimento)) / 31557600000) : 0}
          onFechar={() => setShowOBAModal(false)}
          onConcluir={() => setShowOBAModal(false)}
        />"""

novo_2d = """        <OBAModal
          cpf={profile.cpf}
          sexo={profile.sexo}
          idade={profile.data_nascimento ? Math.floor((Date.now() - new Date(profile.data_nascimento)) / 31557600000) : 0}
          dadosRedFairy={{
            gestante: inputs.gestante,
            semanas_gestacao: inputs.semanas_gestacao ? Number(inputs.semanas_gestacao) : null,
            dum: inputs.dum || null,
          }}
          onFechar={() => setShowOBAModal(false)}
          onConcluir={() => setShowOBAModal(false)}
        />"""

if "dadosRedFairy={{" in dash_src:
    print("AVISO 2d: dadosRedFairy ja e passado em Dashboard.")
elif ancora_2d in dash_src:
    dash_src = dash_src.replace(ancora_2d, novo_2d, 1)
    print("OK 2d: dadosRedFairy passado ao OBAModal em Dashboard.")
else:
    print("ERRO 2d: ancora do OBAModal em Dashboard nao encontrada.")
    sys.exit(1)

DASH.write_text(dash_src, encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# ARQUIVO 3: OBAModal.jsx
# ═════════════════════════════════════════════════════════════════════
OBA = Path("src/components/OBAModal.jsx")
if not OBA.exists():
    print(f"ERRO: {OBA} nao existe.")
    sys.exit(1)

oba_src = OBA.read_text(encoding="utf-8")

# --- 3a: assinatura aceitar dadosRedFairy ---
ancora_3a = "export default function OBAModal({ sexo, cpf, idade, examesRedFairy, onConcluir, onFechar }) {"
novo_3a   = "export default function OBAModal({ sexo, cpf, idade, examesRedFairy, dadosRedFairy, onConcluir, onFechar }) {"

if "dadosRedFairy," in oba_src:
    print("AVISO 3a: assinatura ja tem dadosRedFairy.")
elif ancora_3a in oba_src:
    oba_src = oba_src.replace(ancora_3a, novo_3a, 1)
    print("OK 3a: assinatura OBAModal recebe dadosRedFairy.")
else:
    print("ERRO 3a: ancora da assinatura em OBAModal nao encontrada.")
    sys.exit(1)

# --- 3b: useEffect de propagacao ---
# Primeiro garantir que useEffect esta importado
if "import { useState, useEffect" not in oba_src and "useEffect" not in oba_src:
    if "import { useState }" in oba_src:
        oba_src = oba_src.replace("import { useState }", "import { useState, useEffect }", 1)
        print("OK 3c: useEffect adicionado ao import.")
    elif "import { useState," in oba_src:
        # ja tem algo alem de useState, precisa verificar
        if "useEffect" not in oba_src.split("from 'react'")[0]:
            oba_src = oba_src.replace(
                "import { useState,",
                "import { useState, useEffect,",
                1
            )
            print("OK 3c: useEffect adicionado ao import.")
    else:
        print("AVISO 3c: nao foi possivel ajustar imports automaticamente. Verifique manualmente se useEffect esta importado em OBAModal.")

# Agora adicionar o useEffect apos o useState do form
ancora_3b = """    compulsoes: [], medicamentos: [], emagrecedores: {},
  })"""

novo_3b = """    compulsoes: [], medicamentos: [], emagrecedores: {},
  })

  // Fase 1: pre-preenche Status Gestacional se vier da RedFairy
  useEffect(() => {
    if (dadosRedFairy?.gestante) {
      setForm(prev => ({
        ...prev,
        status_gestacional: prev.status_gestacional || 'GRÁVIDA',
        semanas_gestacao: prev.semanas_gestacao || (dadosRedFairy.semanas_gestacao ? String(dadosRedFairy.semanas_gestacao) : ''),
      }))
    }
  }, [dadosRedFairy])"""

if "// Fase 1: pre-preenche Status Gestacional" in oba_src:
    print("AVISO 3b: useEffect de propagacao ja existe em OBAModal.")
elif ancora_3b in oba_src:
    oba_src = oba_src.replace(ancora_3b, novo_3b, 1)
    print("OK 3b: useEffect de propagacao adicionado em OBAModal.")
else:
    print("ERRO 3b: ancora do fim do useState form em OBAModal nao encontrada.")
    sys.exit(1)

OBA.write_text(oba_src, encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("FASE 1 APLICADA!")
print("=" * 60)
print()
print("Arquivos modificados:")
print(f"  - {CALC}")
print(f"  - {DASH}")
print(f"  - {OBA}")
print()
print("=" * 60)
print("⚠️  IMPORTANTE: ANTES DE TESTAR, RODE O SQL ABAIXO NO SUPABASE")
print("=" * 60)
print("""
-- Abra: https://supabase.com/dashboard/project/pfzghybajniyesoiwrcp/sql/new
-- Cole o SQL abaixo e clique em RUN:

ALTER TABLE avaliacoes
  ADD COLUMN IF NOT EXISTS semanas_gestacao numeric NULL,
  ADD COLUMN IF NOT EXISTS dum date NULL;

COMMENT ON COLUMN avaliacoes.semanas_gestacao IS 'Semanas de gestacao na data da coleta (1-42). NULL se nao aplicavel.';
COMMENT ON COLUMN avaliacoes.dum IS 'Data da ultima menstruacao (opcional). Usada para validar semanas_gestacao.';
""")
print("=" * 60)
print()
print("Proximo passo (SO APOS RODAR O SQL):")
print('  git add . && git commit -m "feat: Fase 1 - semanas de gestacao + DUM integradas RF->OBA" && git push origin main')
