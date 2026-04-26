"""
fix_modo_medico_oba_v2.py
=========================
VERSÃO 2 - âncora 4 corrigida (estava esperando "OBA carregado" mas
o arquivo tem "meses pós-op"). Demais mudanças idênticas à v1.

Implementa: "Médico apenas marca 'Paciente Bariátrico(a)'; o paciente
preenche a anamnese OBA na plataforma após cadastro."

5 MUDANÇAS:

  1. [Calculator.jsx L692-696] REMOVE bloqueio do submit.
  2. [Calculator.jsx L711]     OBA opcional no submit.
  3. [Calculator.jsx L1116-1122] Checkbox dinâmico por sexo.
  4. [Calculator.jsx L1216-1235] REMOVE cartão roxo + botão Preencher.
  5. [ResultCard.jsx ~L1062]   ADICIONA aviso azul Texto 3 dinâmico.

PRÉ-REQUISITO:
  Os arquivos Calculator.jsx e ResultCard.jsx devem estar no estado original
  (já foram revertidos a partir dos .bak na rodada anterior).

Como rodar:
    python fix_modo_medico_oba_v2.py
"""

import os
import sys
import shutil

CALC = os.path.join("src", "components", "Calculator.jsx")
RESULT = os.path.join("src", "components", "ResultCard.jsx")

def ler(caminho):
    with open(caminho, "r", encoding="utf-8") as f:
        return f.read()

def gravar(caminho, conteudo):
    with open(caminho, "w", encoding="utf-8") as f:
        f.write(conteudo)

def backup(caminho):
    bak = caminho + ".bak3"
    shutil.copy(caminho, bak)
    print(f"  Backup criado: {bak}")

def aplicar(conteudo, antigo, novo, descricao):
    contagem = conteudo.count(antigo)
    if contagem == 0:
        print(f"  ❌ FALHA - âncora não encontrada: {descricao}")
        return None
    if contagem > 1:
        print(f"  ❌ FALHA - âncora ambígua ({contagem}x): {descricao}")
        return None
    print(f"  ✅ OK - {descricao}")
    return conteudo.replace(antigo, novo)

def banner(titulo):
    print("\n" + "=" * 70)
    print(f"  {titulo}")
    print("=" * 70)

# ─────────────────────────────────────────────────────────────────────────────
def fix_calculator():
    banner("CALCULATOR.JSX - 4 mudanças")

    if not os.path.exists(CALC):
        print(f"❌ {CALC} não encontrado"); return False

    backup(CALC)
    conteudo = ler(CALC)
    original = conteudo

    # 1) Bloqueio do submit
    antigo1 = """    // Se bariátrico e ainda não preencheu o OBAModal → abrir agora
    if (inputs.bariatrica && !dadosOBARef.current && !dadosOBAColetados) {
      setShowOBA(true);
      return;
    }

"""
    conteudo = aplicar(conteudo, antigo1, "", "1) Remove bloqueio do submit")
    if conteudo is None: return False

    # 2) OBA opcional
    antigo2 = """    let obaResult = null;
    if (inputs.bariatrica) {
      let dadosOBA = null;
      let examesOBA = null;

      const obaDisponivel = dadosOBAColetados || dadosOBARef.current;
      if (obaDisponivel) {"""
    novo2 = """    let obaResult = null;
    // OBA só é processado se o paciente já preencheu a anamnese (Modo Paciente).
    // No Modo Médico, a flag bariatrica é apenas registrada — paciente preenche depois.
    const obaDisponivel = dadosOBAColetados || dadosOBARef.current;
    if (inputs.bariatrica && obaDisponivel) {
      let dadosOBA = null;
      let examesOBA = null;
      if (obaDisponivel) {"""
    conteudo = aplicar(conteudo, antigo2, novo2, "2) Torna OBA opcional no submit")
    if conteudo is None: return False

    # 3) Checkbox dinâmico
    antigo3 = """                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-tight">Paciente Bariátrico</p>
                    <p className="text-xs opacity-70 leading-tight mt-0.5">Encaminha para avaliação OBA no modo paciente</p>
                  </div>"""
    novo3 = """                  <div className="min-w-0">
                    <p className="font-medium text-sm leading-tight">
                      {inputs.sexo === 'F' ? 'Paciente Bariátrica' : 'Paciente Bariátrico'}
                    </p>
                    <p className="text-xs opacity-70 leading-tight mt-0.5">
                      {inputs.sexo === 'F'
                        ? 'Se a paciente avaliada é BARIÁTRICA ela receberá a ANAMNESE do Projeto OBA, e passará a ter o acompanhamento dinâmico para a melhor qualidade de vida.'
                        : 'Se o paciente avaliado é BARIÁTRICO ele receberá a ANAMNESE do Projeto OBA, e passará a ter o acompanhamento dinâmico para a melhor qualidade de vida.'}
                    </p>
                  </div>"""
    conteudo = aplicar(conteudo, antigo3, novo3, "3) Checkbox dinâmico por sexo")
    if conteudo is None: return False

    # 4) Cartão roxo (ÂNCORA CORRIGIDA: "meses pós-op" em vez de "OBA carregado")
    antigo4 = """            {inputs.bariatrica && (
              <div className="mt-3 bg-purple-50 border border-purple-200 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-700 text-xs font-semibold">
                      🔬 Avaliação OBA {dadosOBAColetados ? '✓ dados coletados' : '— pendente'}
                    </p>
                    <p className="text-purple-600 text-xs mt-0.5">
                      {dadosOBAColetados
                        ? `${dadosOBAColetados.dadosOBA.tipo_cirurgia} · ${dadosOBAColetados.dadosOBA.meses_pos_cirurgia} meses pós-op`
                        : 'Preencha a anamnese para ativar os 13 módulos clínicos.'}
                    </p>
                  </div>
                  <button type="button" onClick={() => setShowOBA(true)}
                    className="ml-3 flex-shrink-0 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                    {dadosOBAColetados ? 'Editar' : 'Preencher'}
                  </button>
                </div>
              </div>
            )}
"""
    conteudo = aplicar(conteudo, antigo4, "", "4) Remove cartão roxo + botão Preencher")
    if conteudo is None: return False

    if conteudo != original:
        gravar(CALC, conteudo)
        print(f"\n  ✅ {CALC} atualizado")
        return True
    return False

# ─────────────────────────────────────────────────────────────────────────────
def fix_resultcard():
    banner("RESULTCARD.JSX - 1 mudança")

    if not os.path.exists(RESULT):
        print(f"❌ {RESULT} não encontrado"); return False

    backup(RESULT)
    conteudo = ler(RESULT)
    original = conteudo

    # 5) Aviso Texto 3
    antigo5 = """          <div>
            <h4 className={`font-semibold text-sm uppercase tracking-wide mb-2 ${scheme.text}`}>📋 Recomendação</h4>
            <p className="text-gray-700 text-sm leading-relaxed bg-white rounded-xl p-4 border border-gray-100">
              {resultado.recomendacao}
            </p>
          </div>

          {precisaFerroEV && ("""
    novo5 = """          <div>
            <h4 className={`font-semibold text-sm uppercase tracking-wide mb-2 ${scheme.text}`}>📋 Recomendação</h4>
            <p className="text-gray-700 text-sm leading-relaxed bg-white rounded-xl p-4 border border-gray-100">
              {resultado.recomendacao}
            </p>
          </div>

          {/* Aviso ao médico: paciente bariátrico será encaminhado ao Projeto OBA */}
          {!modoPaciente && resultado._inputs?.bariatrica && (() => {
            const sx = resultado._inputs?.sexo || 'M'
            const txt = sx === 'F'
              ? 'Avaliação salva sob o CPF da paciente. Ao se cadastrar, ela terá acesso ao Projeto OBA — Otimizar o Bariátrico.'
              : 'Avaliação salva sob o CPF do paciente. Ao se cadastrar, ele terá acesso ao Projeto OBA — Otimizar o Bariátrico.'
            return (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-bold text-blue-800 mb-1">📤 Encaminhamento ao Projeto OBA</p>
                <p className="text-gray-700 text-sm leading-relaxed">{txt}</p>
              </div>
            )
          })()}

          {precisaFerroEV && ("""
    conteudo = aplicar(conteudo, antigo5, novo5, "5) Adiciona aviso Texto 3 dinâmico")
    if conteudo is None: return False

    if conteudo != original:
        gravar(RESULT, conteudo)
        print(f"\n  ✅ {RESULT} atualizado")
        return True
    return False

# ─────────────────────────────────────────────────────────────────────────────
def main():
    print("=" * 70)
    print("  FIX v2: Modo Médico apenas marca bariátrico - Paciente preenche OBA")
    print("=" * 70)

    if not os.path.exists(CALC) or not os.path.exists(RESULT):
        print("ERRO: Rode da raiz do projeto redfairy/")
        sys.exit(1)

    ok_calc = fix_calculator()
    ok_result = fix_resultcard()

    banner("RESUMO")
    if ok_calc and ok_result:
        print("""
  ✅ Todas as 5 mudanças aplicadas com sucesso!

  Backups: src/components/Calculator.jsx.bak3, ResultCard.jsx.bak3

  Próximos passos:
    1. npm run build
    2. npm run preview
    3. Testar em janela anônima (Ctrl+Shift+N) -> http://localhost:4173
    4. Cenário 1: Modo Médico, marcar bariátrico, mudar Sexo F/M -> ler textos
    5. Cenário 1: avaliar paciente -> resultado deve aparecer com aviso azul
                 "Encaminhamento ao Projeto OBA" no gênero correto
    6. Cenário 2: Modo Médico, NÃO bariátrico -> resultado SEM aviso azul
    7. Cenário 3: Modo Paciente bariátrico -> OBAModal abre automaticamente

    Se passar nos 3:
      git add . && git commit -m "feat: medico apenas marca bariatrico, paciente preenche OBA na plataforma" && git push
    Se quebrou:
      copy /Y src\\components\\Calculator.jsx.bak3 src\\components\\Calculator.jsx
      copy /Y src\\components\\ResultCard.jsx.bak3 src\\components\\ResultCard.jsx
""")
    else:
        print("""
  ❌ Aplicação parcial ou falhou.
  Cole o output completo no chat.
  Para reverter:
    copy /Y src\\components\\Calculator.jsx.bak3 src\\components\\Calculator.jsx
    copy /Y src\\components\\ResultCard.jsx.bak3 src\\components\\ResultCard.jsx
""")

if __name__ == "__main__":
    main()
