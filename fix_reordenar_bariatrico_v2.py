"""
fix_reordenar_bariatrico_v2.py
==============================
Reordena campos do card "Dados do Paciente":

ANTES:  CPF | Bariátrico (faixa) | Sexo | Idade | Data
DEPOIS: CPF | Sexo | Idade | Bariátrico (faixa) | Data

Âncoras corrigidas com base em inspect_dados_paciente.py.
"""

import os
import sys
import shutil

CALC = os.path.join("src", "components", "Calculator.jsx")

def main():
    print("=" * 60)
    print("  Reordenar: Bariátrico vai pra DEPOIS de Idade")
    print("=" * 60)

    if not os.path.exists(CALC):
        print(f"ERRO: {CALC} nao encontrado")
        sys.exit(1)

    bak = CALC + ".bak5"
    shutil.copy(CALC, bak)
    print(f"\nBackup: {bak}")

    with open(CALC, "r", encoding="utf-8") as f:
        conteudo = f.read()

    # Bloco bariátrico atual (L1110-1125) — REMOVER daqui
    bloco_bariatrico = """              <div className="col-span-2">
                <label className={`flex items-start gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${inputs.bariatrica_medico ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                  <input type="checkbox" name="bariatrica_medico" checked={inputs.bariatrica_medico} onChange={handleChange} className="mt-0.5 w-4 h-4 cursor-pointer flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-tight">
                      {inputs.sexo === 'F' ? 'Paciente Bariátrica' : 'Paciente Bariátrico'}
                    </p>
                    <p className="text-xs opacity-70 leading-tight mt-0.5">
                      {inputs.sexo === 'F'
                        ? 'Se a paciente avaliada é BARIÁTRICA ela receberá a ANAMNESE do Projeto OBA, e passará a ter o acompanhamento dinâmico para a melhor qualidade de vida.'
                        : 'Se o paciente avaliado é BARIÁTRICO ele receberá a ANAMNESE do Projeto OBA, e passará a ter o acompanhamento dinâmico para a melhor qualidade de vida.'}
                    </p>
                  </div>
                </label>
                
              </div>
"""

    # 1) Remover bloco do meio
    contagem = conteudo.count(bloco_bariatrico)
    if contagem != 1:
        print(f"\n  ❌ FALHA: bloco bariátrico encontrado {contagem}x (esperava 1)")
        sys.exit(1)
    conteudo = conteudo.replace(bloco_bariatrico, "")
    print("  ✅ 1) Bloco bariátrico removido do meio")

    # 2) Inserir bloco depois do bloco Idade
    bloco_idade_atual = """              <div>
                <label className="label">Idade</label>
                <input type="number" name="idade" value={inputs.idade} onChange={handleChange} placeholder="12-100" min={12} max={100} className={`input ${erros.idade ? 'border-red-500' : ''}`} />
                {erros.idade && <p className="text-red-500 text-xs mt-1">{erros.idade}</p>}
              </div>
"""

    bloco_idade_com_bariatrico = bloco_idade_atual + bloco_bariatrico

    contagem2 = conteudo.count(bloco_idade_atual)
    if contagem2 != 1:
        print(f"\n  ❌ FALHA: bloco Idade encontrado {contagem2}x (esperava 1)")
        sys.exit(1)
    conteudo = conteudo.replace(bloco_idade_atual, bloco_idade_com_bariatrico)
    print("  ✅ 2) Bloco bariátrico inserido depois de Idade")

    with open(CALC, "w", encoding="utf-8") as f:
        f.write(conteudo)

    print(f"\n  ✅ {CALC} atualizado")
    print("""
  Próximos passos:
    npm run build
    npm run preview

  Reverter:
    copy /Y src\\components\\Calculator.jsx.bak5 src\\components\\Calculator.jsx
""")

if __name__ == "__main__":
    main()
