"""
fix_modo_medico_oba.py
======================
Implementa a nova diretriz: "Médico apenas marca 'Paciente Bariátrico(a)';
o paciente preenche a anamnese OBA na plataforma após cadastro."

5 MUDANÇAS:

  1. [Calculator.jsx L692-696]
     REMOVE bloqueio do submit quando bariatrica está marcada.
     Médico agora pode finalizar avaliação sem passar pelo OBAModal.

  2. [Calculator.jsx L711]
     Torna o processamento OBA opcional no submit.
     De: if (inputs.bariatrica)
     Para: if (inputs.bariatrica && (dadosOBARef.current || dadosOBAColetados))

  3. [Calculator.jsx L1116-1122]
     Substitui textos do checkbox "Paciente Bariátrico" por versão dinâmica
     baseada em inputs.sexo (M -> Bariátrico/ele; F -> Bariátrica/ela).

  4. [Calculator.jsx L1216-1235]
     REMOVE totalmente o cartão roxo "Avaliação OBA pendente / Preencher".

  5. [ResultCard.jsx L1062-1063]
     ADICIONA card azul informativo (Texto 3 dinâmico por sexo) quando:
     - !modoPaciente (só Modo Médico)
     - resultado._inputs?.bariatrica === true

VALIDAÇÕES:
  - Lê os arquivos antes
  - Verifica âncoras únicas
  - Aplica via str.replace
  - Salva backup .bak ao lado de cada arquivo modificado
  - Imprime resumo do que foi mudado

Como rodar:
    copy /Y "C:\\Users\\Estacio\\Downloads\\fix_modo_medico_oba.py" "C:\\Users\\Estacio\\Desktop\\redfairy\\fix_modo_medico_oba.py"
    cd C:\\Users\\Estacio\\Desktop\\redfairy
    python fix_modo_medico_oba.py

Após rodar:
    npm run build
    npm run preview      # testar em http://localhost:4173 (janela anônima)
    git add . && git commit -m "feat: medico apenas marca bariatrico, paciente preenche OBA na plataforma" && git push origin main
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
    shutil.copy(caminho, caminho + ".bak")
    print(f"  Backup criado: {caminho}.bak")

def aplicar(conteudo, antigo, novo, descricao):
    """Aplica substituição com validação de unicidade."""
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
#  CALCULATOR.JSX
# ─────────────────────────────────────────────────────────────────────────────

def fix_calculator():
    banner("CALCULATOR.JSX - 4 mudanças")

    if not os.path.exists(CALC):
        print(f"❌ Arquivo não encontrado: {CALC}")
        return False

    backup(CALC)
    conteudo = ler(CALC)
    original = conteudo

    # ───────────────────────────────────────────────────────────
    # MUDANÇA 1: Remover bloqueio do submit (L692-696)
    # ───────────────────────────────────────────────────────────
    antigo1 = """    // Se bariátrico e ainda não preencheu o OBAModal → abrir agora
    if (inputs.bariatrica && !dadosOBARef.current && !dadosOBAColetados) {
      setShowOBA(true);
      return;
    }

"""
    novo1 = ""  # remove totalmente
    conteudo = aplicar(
        conteudo, antigo1, novo1,
        "1) Remove bloqueio do submit (L692-696)",
    )
    if conteudo is None:
        return False

    # ───────────────────────────────────────────────────────────
    # MUDANÇA 2: Tornar OBA opcional no submit (L711)
    # ───────────────────────────────────────────────────────────
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
    conteudo = aplicar(
        conteudo, antigo2, novo2,
        "2) Torna OBA opcional no submit (L711)",
    )
    if conteudo is None:
        return False

    # ───────────────────────────────────────────────────────────
    # MUDANÇA 3: Checkbox dinâmico por sexo (L1116-1122)
    # ───────────────────────────────────────────────────────────
    # Antes:
    #   <p className="font-medium text-sm leading-tight">Paciente Bariátrico</p>
    #   <p className="text-xs opacity-70 leading-tight mt-0.5">Encaminha para avaliação OBA no modo paciente</p>
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
    conteudo = aplicar(
        conteudo, antigo3, novo3,
        "3) Checkbox dinâmico por sexo (L1116-1122)",
    )
    if conteudo is None:
        return False

    # ───────────────────────────────────────────────────────────
    # MUDANÇA 4: Remover cartão roxo (L1216-1235)
    # ───────────────────────────────────────────────────────────
    antigo4 = """            {inputs.bariatrica && (
              <div className="mt-3 bg-purple-50 border border-purple-200 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-700 text-xs font-semibold">
                      🔬 Avaliação OBA {dadosOBAColetados ? '✓ dados coletados' : '— pendente'}
                    </p>
                    <p className="text-purple-600 text-xs mt-0.5">
                      {dadosOBAColetados
                        ? `${dadosOBAColetados.dadosOBA.tipo_cirurgia} · ${dadosOBAColetados.dadosOBA.meses_pos_cirurgia} meses pós · OBA carregado`
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
    novo4 = ""  # remove totalmente
    conteudo = aplicar(
        conteudo, antigo4, novo4,
        "4) Remove cartão roxo + botão Preencher (L1216-1235)",
    )
    if conteudo is None:
        return False

    # Salva
    if conteudo != original:
        gravar(CALC, conteudo)
        print(f"\n  ✅ {CALC} atualizado")
        return True
    else:
        print(f"\n  ⚠️ Nenhuma mudança aplicada em {CALC}")
        return False

# ─────────────────────────────────────────────────────────────────────────────
#  RESULTCARD.JSX
# ─────────────────────────────────────────────────────────────────────────────

def fix_resultcard():
    banner("RESULTCARD.JSX - 1 mudança")

    if not os.path.exists(RESULT):
        print(f"❌ Arquivo não encontrado: {RESULT}")
        return False

    backup(RESULT)
    conteudo = ler(RESULT)
    original = conteudo

    # ───────────────────────────────────────────────────────────
    # MUDANÇA 5: Adicionar Texto 3 dinâmico após Recomendação
    # Inserir entre L1062 (fim da div Recomendação) e L1064 (precisaFerroEV)
    # ───────────────────────────────────────────────────────────
    # Âncora: o bloco da Recomendação termina assim, e depois vem o
    # bloco precisaFerroEV. Vou inserir entre eles.
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
    conteudo = aplicar(
        conteudo, antigo5, novo5,
        "5) Adiciona aviso Texto 3 dinâmico (após Recomendação)",
    )
    if conteudo is None:
        return False

    # Salva
    if conteudo != original:
        gravar(RESULT, conteudo)
        print(f"\n  ✅ {RESULT} atualizado")
        return True
    else:
        print(f"\n  ⚠️ Nenhuma mudança aplicada em {RESULT}")
        return False

# ─────────────────────────────────────────────────────────────────────────────
#  MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main():
    print("=" * 70)
    print("  FIX: Modo Médico apenas marca bariátrico — Paciente preenche OBA")
    print("=" * 70)

    if not os.path.exists(CALC) or not os.path.exists(RESULT):
        print("ERRO: Rode este script da raiz do projeto redfairy/")
        sys.exit(1)

    ok_calc = fix_calculator()
    ok_result = fix_resultcard()

    banner("RESUMO")
    if ok_calc and ok_result:
        print("""
  ✅ Todas as 5 mudanças aplicadas com sucesso!

  Backups criados:
    src/components/Calculator.jsx.bak
    src/components/ResultCard.jsx.bak

  Próximos passos:
    1. npm run build
    2. npm run preview          # http://localhost:4173 (janela anônima)
    3. Testar:
       a) Modo Médico: marcar "Paciente Bariátrico" + dados eritron
          → resultado deve aparecer SEM cartão roxo no formulário
          → resultado deve mostrar aviso azul "Encaminhamento ao Projeto OBA"
          → texto deve estar no gênero correto conforme Sexo
       b) Modo Paciente bariátrico: preencher avaliação
          → OBAModal deve abrir automaticamente após avaliação (já funcionava)
    4. Se OK: git add . && git commit -m "feat: medico apenas marca bariatrico, paciente preenche OBA na plataforma" && git push
    5. Se quebrou: restaurar backups manualmente:
       copy /Y src\\components\\Calculator.jsx.bak src\\components\\Calculator.jsx
       copy /Y src\\components\\ResultCard.jsx.bak src\\components\\ResultCard.jsx
""")
    else:
        print("""
  ❌ Aplicação parcial ou falhou.

  Para reverter:
    copy /Y src\\components\\Calculator.jsx.bak src\\components\\Calculator.jsx
    copy /Y src\\components\\ResultCard.jsx.bak src\\components\\ResultCard.jsx

  Cole o output completo no chat para análise.
""")

if __name__ == "__main__":
    main()
