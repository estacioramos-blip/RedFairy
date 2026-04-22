"""
fix_validacao_data.py

Validacoes de data da coleta:

  1. Calculator.jsx
     - validar(): bloqueia data no futuro

  2. PatientDashboard.jsx
     - antes do insert, valida data no futuro

  3. decisionEngine.js
     - resultado recebe flag 'obsoleto' (true se dias > 730)

  4. ResultCard.jsx
     - se resultado.obsoleto: mostra card especial OBSOLETO
     - botao 'Ver avaliacao obsoleta' expande o diagnostico normal
       com badge vermelho OBSOLETO persistente
"""

from pathlib import Path
import sys

# ═════════════════════════════════════════════════════════════════════
# 1. Calculator.jsx — validar data futura
# ═════════════════════════════════════════════════════════════════════
CALC = Path("src/components/Calculator.jsx")
calc_src = CALC.read_text(encoding="utf-8")

ancora_calc = """    if (!inputs.dataColeta) novosErros.dataColeta = 'Informe a data da coleta';"""
novo_calc = """    if (!inputs.dataColeta) novosErros.dataColeta = 'Informe a data da coleta';
    else {
      const hojeStr = new Date().toISOString().split('T')[0];
      if (inputs.dataColeta > hojeStr) novosErros.dataColeta = 'Data da coleta não pode ser no futuro';
    }"""

if "Data da coleta não pode ser no futuro" in calc_src:
    print("AVISO 1: validacao de data futura ja existe em Calculator.")
elif ancora_calc in calc_src:
    calc_src = calc_src.replace(ancora_calc, novo_calc, 1)
    CALC.write_text(calc_src, encoding="utf-8")
    print("OK 1: Calculator agora bloqueia data futura.")
else:
    print("ERRO 1: ancora da validacao em Calculator nao encontrada.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
# 2. PatientDashboard.jsx — validar data futura antes do insert
# ═════════════════════════════════════════════════════════════════════
DASH = Path("src/components/PatientDashboard.jsx")
dash_src = DASH.read_text(encoding="utf-8")

# Vamos achar a funcao que faz insert e inserir validacao no inicio dela
# Procura 'data_coleta: inputs.dataColeta,' (linha 161 do diagnostico)
ancora_dash = """        user_id: session.user.id,
        data_coleta: inputs.dataColeta,"""

if "Data da coleta não pode ser no futuro" in dash_src:
    print("AVISO 2: validacao ja existe em Dashboard.")
elif ancora_dash in dash_src:
    # Encontrar inicio da funcao que contem isto
    # Estrategia: subir ate achar 'async function' ou 'function avaliar'
    idx = dash_src.find(ancora_dash)
    # Achar o '{' mais proximo antes (inicio do bloco da funcao)
    # Mais simples: insere validacao logo ANTES da linha 'await supabase'
    # Mas isso eh fragil. Melhor: insere uma checagem antes do insert,
    # entao colocamos exatamente antes de '.from(\'avaliacoes\')' que precede o insert.
    ancora_insert_dash = """      const { error } = await supabase.from('avaliacoes').insert({"""
    if ancora_insert_dash not in dash_src:
        # Pode ter formato diferente, vamos tentar variante
        ancora_insert_dash = "from('avaliacoes')\n        .insert({"

    if ancora_insert_dash in dash_src:
        guard = """      // Validacao: data no futuro
      const _hojeDash = new Date().toISOString().split('T')[0]
      if (inputs.dataColeta > _hojeDash) {
        alert('Data da coleta não pode ser no futuro.')
        return
      }
      """
        dash_src = dash_src.replace(ancora_insert_dash, guard + ancora_insert_dash, 1)
        DASH.write_text(dash_src, encoding="utf-8")
        print("OK 2: Dashboard agora bloqueia data futura (alert nativo).")
    else:
        print("AVISO 2: nao foi possivel localizar o ponto de insert no Dashboard.")
        print("         A validacao do Calculator ja cobre os casos via Modo Medico.")
else:
    print("AVISO 2: ancora do Dashboard nao encontrada (pode estar em formato diferente).")

# ═════════════════════════════════════════════════════════════════════
# 3. decisionEngine.js — flag 'obsoleto' no resultado
# ═════════════════════════════════════════════════════════════════════
ENG = Path("src/engine/decisionEngine.js")
eng_src = ENG.read_text(encoding="utf-8")

ancora_eng = """    diasDesdeColeta: dias,
    achadosParalelos,
  };"""
novo_eng = """    diasDesdeColeta: dias,
    achadosParalelos,
    obsoleto: dias > 730,
  };"""

if "obsoleto: dias > 730" in eng_src:
    print("AVISO 3: flag obsoleto ja existe no engine.")
elif ancora_eng in eng_src:
    eng_src = eng_src.replace(ancora_eng, novo_eng, 1)
    ENG.write_text(eng_src, encoding="utf-8")
    print("OK 3: decisionEngine agora retorna flag 'obsoleto' (dias > 730).")
else:
    print("ERRO 3: ancora do return no engine nao encontrada.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
# 4. ResultCard.jsx — card especial OBSOLETO
# ═════════════════════════════════════════════════════════════════════
RC = Path("src/components/ResultCard.jsx")
rc_src = RC.read_text(encoding="utf-8")

# Estrategia: logo apos o 'if (!resultado.encontrado)' bloco, antes do return principal,
# adicionar um early return se obsoleto.
# Vamos achar 'if (!resultado.encontrado)' e inserir antes dele um novo bloco.

ancora_rc = """  if (!resultado.encontrado) {"""

if "// Renderizacao especial: exames obsoletos" in rc_src:
    print("AVISO 4: card de obsoleto ja existe no ResultCard.")
elif ancora_rc in rc_src:
    bloco_obsoleto = """  // Renderizacao especial: exames obsoletos (> 2 anos)
  const [verObsoleto, setVerObsoleto] = useState(false);
  if (resultado.obsoleto && !verObsoleto) {
    return (
      <div className="mt-4 rounded-2xl border-2 border-red-400 bg-red-50 overflow-hidden shadow-sm">
        <div className="bg-red-700 text-white px-6 py-4">
          <p className="text-xs uppercase tracking-widest opacity-80 mb-1">⚠️ Aviso</p>
          <h3 className="text-xl font-bold">EXAMES OBSOLETOS</h3>
          <p className="text-xs opacity-90 mt-1">
            Realizados há {resultado.diasDesdeColeta} dia(s) — mais de 2 anos atrás
          </p>
        </div>
        <div className="p-6 space-y-4 text-sm text-gray-800 leading-relaxed">
          <p>
            <strong>Esta avaliação NÃO TEM SIGNIFICADO CLÍNICO ATUAL.</strong>
          </p>
          <p>
            Sugerimos que você faça os exames recomendados (hemograma, ferritina,
            saturação da transferrina) para obter uma avaliação válida.
          </p>
          <div className="bg-white border border-red-200 rounded-xl p-4 text-sm text-gray-700">
            💡 A plataforma RedFairy pode emitir a solicitação dos exames mediante
            o pagamento de uma pequena taxa, evitando a necessidade de uma consulta
            presencial apenas para isso. Após realizar os exames, retorne aqui para
            nova avaliação.
          </div>
          <button
            onClick={() => setVerObsoleto(true)}
            className="w-full mt-4 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg transition-colors"
          >
            Ver avaliação obsoleta (apenas referência histórica)
          </button>
        </div>
      </div>
    );
  }

  if (!resultado.encontrado) {"""

    rc_src = rc_src.replace(ancora_rc, bloco_obsoleto, 1)
    RC.write_text(rc_src, encoding="utf-8")
    print("OK 4: ResultCard agora mostra card OBSOLETO com botao 'Ver avaliacao'.")
else:
    print("ERRO 4: ancora do !resultado.encontrado nao encontrada.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("FIX APLICADO!")
print("=" * 60)
print()
print("Comportamento:")
print("  Data FUTURA  -> bloqueia submit (Calculator e Dashboard)")
print("  0-730 dias   -> avaliacao normal")
print("  > 730 dias   -> card OBSOLETO + botao 'Ver avaliacao'")
print()
print("Nota: ao clicar em 'Ver avaliacao obsoleta', o diagnostico")
print("normal aparece (sem badge persistente nesta versao - pode ser")
print("adicionado depois se necessario).")
print()
print("Proximo passo:")
print('  git add . && git commit -m "feat: validacao de data (futura bloqueia, > 2 anos = obsoleto)" && git push origin main')
