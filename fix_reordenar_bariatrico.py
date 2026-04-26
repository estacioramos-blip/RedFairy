"""
fix_reordenar_bariatrico.py
===========================
Reordena os campos do card "Dados do Paciente" no Calculator.jsx:

ANTES:
  CPF
  Paciente Bariátrico (faixa)
  Sexo | Idade
  Data da Coleta

DEPOIS:
  CPF
  Sexo | Idade
  Paciente Bariátrico/a (faixa)
  Data da Coleta

Pré-requisito: fix_modo_medico_oba_v2.py já foi aplicado.

Como rodar:
    python fix_reordenar_bariatrico.py
"""

import os
import sys
import shutil

CALC = os.path.join("src", "components", "Calculator.jsx")

def main():
    print("=" * 60)
    print("  Reordenar campos: Bariátrico vai pra depois de Sexo/Idade")
    print("=" * 60)

    if not os.path.exists(CALC):
        print(f"ERRO: {CALC} não encontrado")
        sys.exit(1)

    bak = CALC + ".bak4"
    shutil.copy(CALC, bak)
    print(f"\nBackup criado: {bak}")

    with open(CALC, "r", encoding="utf-8") as f:
        conteudo = f.read()

    # Bloco completo: do início do CPF até o fim de Data da Coleta
    # Capturando os 4 grupos: CPF, Bariátrico-faixa, Sexo+Idade, Data
    antigo = """              <div>
                <label className="label">CPF</label>
                <input type="text" name="cpf" value={inputs.cpf} onChange={handleChange} placeholder="000.000.000-00" maxLength={14} className={`input ${erros.cpf ? 'border-red-500' : ''}`} />
                <p className="text-xs text-gray-400 mt-0.5">Vincula ao paciente</p>
                <p className="text-xs text-orange-500 mt-0.5">Digite apenas os números, sem pontos ou hífen</p>
              </div>
              <div className="col-span-2">
                <label className={`flex items-start gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${inputs.bariatrica_medico ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white hover:border-amber-300'}`}>
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
              <div>
                <label className="label">Sexo</label>
                <select name="sexo" value={inputs.sexo} onChange={handleChange} className="input">
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>"""

    # Versão com Sexo+Idade ANTES, Bariátrico DEPOIS
    novo = """              <div>
                <label className="label">CPF</label>
                <input type="text" name="cpf" value={inputs.cpf} onChange={handleChange} placeholder="000.000.000-00" maxLength={14} className={`input ${erros.cpf ? 'border-red-500' : ''}`} />
                <p className="text-xs text-gray-400 mt-0.5">Vincula ao paciente</p>
                <p className="text-xs text-orange-500 mt-0.5">Digite apenas os números, sem pontos ou hífen</p>
              </div>
              <div>
                <label className="label">Sexo</label>
                <select name="sexo" value={inputs.sexo} onChange={handleChange} className="input">
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>"""

    # Marcador para identificar e mover o bloco bariátrico depois de Idade
    # (vamos remover o bloco bariátrico do meio e inseri-lo depois de Idade)
    contagem = conteudo.count(antigo)
    if contagem != 1:
        print(f"\n  ❌ FALHA - âncora 1 encontrada {contagem}x (esperava 1)")
        sys.exit(1)

    # Aplica primeira parte: remove bloco bariátrico do meio
    conteudo = conteudo.replace(antigo, novo)
    print("  ✅ OK - 1) Removido bloco bariátrico do meio (entre CPF e Sexo)")

    # Agora insere bloco bariátrico DEPOIS do bloco Idade
    # Localizar fim do bloco Idade
    antigo2 = """              <div>
                <label className="label">Idade</label>
                <input type="number" name="idade" value={inputs.idade} onChange={handleChange} placeholder="12-100" className={`input ${erros.idade ? 'border-red-500' : ''}`} />
              </div>"""

    novo2 = """              <div>
                <label className="label">Idade</label>
                <input type="number" name="idade" value={inputs.idade} onChange={handleChange} placeholder="12-100" className={`input ${erros.idade ? 'border-red-500' : ''}`} />
              </div>
              <div className="col-span-2">
                <label className={`flex items-start gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${inputs.bariatrica_medico ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white hover:border-amber-300'}`}>
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
              </div>"""

    contagem2 = conteudo.count(antigo2)
    if contagem2 != 1:
        print(f"\n  ❌ FALHA - âncora 2 encontrada {contagem2}x (esperava 1)")
        sys.exit(1)

    conteudo = conteudo.replace(antigo2, novo2)
    print("  ✅ OK - 2) Bloco bariátrico inserido depois de Idade")

    with open(CALC, "w", encoding="utf-8") as f:
        f.write(conteudo)

    print(f"\n  ✅ {CALC} atualizado")
    print(f"  Backup: {bak}")
    print("""
  Próximos passos:
    1. npm run build
    2. npm run preview
    3. Testar em http://localhost:4173 (janela anônima)

  Se quebrou:
    copy /Y src\\components\\Calculator.jsx.bak4 src\\components\\Calculator.jsx
""")

if __name__ == "__main__":
    main()
