calc_path   = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'
engine_path = 'C:/Users/Estacio/Desktop/redfairy/src/engine/decisionEngine.js'

# ═══════════════════════════════════════════════════════════════════════════
# 1. Calculator.jsx
# ═══════════════════════════════════════════════════════════════════════════
with open(calc_path, encoding='utf-8') as f:
    calc = f.read()

# 1a. Adicionar novos campos ao estado inicial (inputs)
old_state = "tiroxina: false, hidroxiureia: false, anticonvulsivante: false, testosterona: false,"
new_state  = "tiroxina: false, hidroxiureia: false, anticonvulsivante: false, testosterona: false, anemiaPrevia: false, sideropenia: false, sobrecargaFerro: false, hbAlta: false, celiaco: false, g6pd: false, endometriose: false, doadorSangue: false,"

# 1b. handleLimpar
old_limpar = "tiroxina: false, hidroxiureia: false, anticonvulsivante: false, methotrexato: false, hivTratamento: false, metformina: false, ibp: false"
new_limpar = "tiroxina: false, hidroxiureia: false, anticonvulsivante: false, testosterona: false, anemiaPrevia: false, sideropenia: false, sobrecargaFerro: false, hbAlta: false, celiaco: false, g6pd: false, endometriose: false, doadorSangue: false, methotrexato: false, hivTratamento: false, metformina: false, ibp: false"

# 1c. Novos CheckboxCards no Histórico Clínico — inserir após Transfundido
old_transf = '              <CheckboxCard name="transfundido" label="Transfundido" sublabel="Transfusão de hemácias" checked={inputs.transfundido} onChange={handleChange} color="red" />'
new_transf = old_transf + """
              <CheckboxCard name="anemiaPrevia" label="Anemia Crônica / Prévia" sublabel="Diagnóstico anterior de anemia" checked={inputs.anemiaPrevia} onChange={handleChange} color="red" />
              <CheckboxCard name="sideropenia" label="Deficiência de Ferro" sublabel="Histórico de ferritina baixa" checked={inputs.sideropenia} onChange={handleChange} color="orange" />
              <CheckboxCard name="sobrecargaFerro" label="Excesso de Ferro / Hemocromatose" sublabel="Histórico de ferritina alta" checked={inputs.sobrecargaFerro} onChange={handleChange} color="orange" />
              <CheckboxCard name="hbAlta" label="Hemoglobina Alta / Policitemia" sublabel="Histórico de Hb elevada ou sangrias" checked={inputs.hbAlta} onChange={handleChange} color="red" />
              <CheckboxCard name="doadorSangue" label="Doador de Sangue" sublabel="Doações frequentes" checked={inputs.doadorSangue} onChange={handleChange} color="red" />
              <CheckboxCard name="celiaco" label="Celíaco" sublabel="Doença celíaca — má absorção" checked={inputs.celiaco} onChange={handleChange} color="yellow" />
              <CheckboxCard name="g6pd" label="Deficiência de G-6-PD" sublabel="Favismo — risco de hemólise" checked={inputs.g6pd} onChange={handleChange} color="purple" />"""

# 1d. Testosterona volta para Medicamentos — inserir após Ferro Oral
old_ferro = '              <CheckboxCard name="ferroOral" label="Ferro Oral / Injetável" sublabel="Nos últimos 2 anos" checked={inputs.ferroOral} onChange={handleChange} color="orange" />'
new_ferro = old_ferro + '\n              <CheckboxCard name="testosterona" label="Testosterona / Anabolizante" sublabel="Uso exógeno — causa eritrocitose" checked={inputs.testosterona} onChange={handleChange} color="orange" />'

fixed = []
for old, new, label in [
    (old_state,  new_state,  'estado inicial'),
    (old_limpar, new_limpar, 'handleLimpar'),
    (old_transf, new_transf, 'CheckboxCards histórico'),
    (old_ferro,  new_ferro,  'Testosterona nos Medicamentos'),
]:
    if old in calc:
        calc = calc.replace(old, new)
        fixed.append(f'OK calc: {label}')
    else:
        fixed.append(f'ERRO calc: {label}')

with open(calc_path, 'w', encoding='utf-8') as f:
    f.write(calc)

for msg in fixed:
    print(msg)

# ═══════════════════════════════════════════════════════════════════════════
# 2. decisionEngine.js — comentários + modificador G-6-PD
# ═══════════════════════════════════════════════════════════════════════════
with open(engine_path, encoding='utf-8') as f:
    engine = f.read()

# 2a. Adicionar comentários novos após bloco testosterona
old_anchor = """  if (inputs.testosterona) {
    comentarios.push({ titulo: 'TESTOSTERONA / ANABOLIZANTE', texto: 'O USO EXÓGENO DE TESTOSTERONA OU ANABOLIZANTES ESTIMULA A ERITROPOESE E PODE PRODUZIR ERITROCITOSE (HEMOGLOBINA E HEMATÓCRITO ELEVADOS), AUMENTANDO O RISCO DE TROMBOSE, AVC E INFARTO. SE A HEMOGLOBINA ESTIVER ELEVADA, A TESTOSTERONA EXÓGENA É A CAUSA MAIS PROVÁVEL EM HOMENS EM USO DESSA MEDICAÇÃO. SANGRIAS PERIÓDICAS PODEM SER NECESSÁRIAS PARA CONTROLE. MONITORAR HEMOGRAMA, HEMATÓCRITO E PSA A CADA 3-6 MESES.' });
  }"""

new_anchor = old_anchor + """

  // ── Histórico clínico — condições de base ──────────────────────────────
  if (inputs.anemiaPrevia) {
    comentarios.push({ titulo: 'ANEMIA CRÔNICA / PRÉVIA', texto: 'O HISTÓRICO DE ANEMIA CRÔNICA OU PRÉVIA É RELEVANTE PARA CONTEXTUALIZAR O RESULTADO ATUAL. SE O ERITRON ESTÁ COMPENSADO, A CAUSA FOI TRATADA OU CONTROLADA. SE HÁ ANEMIA PERSISTENTE, INVESTIGAR SE A CAUSA ORIGINAL FOI ADEQUADAMENTE TRATADA OU SE HÁ NOVA CAUSA SOBREPOSTA.' });
  }
  if (inputs.sideropenia) {
    comentarios.push({ titulo: 'DEFICIÊNCIA DE FERRO (HISTÓRICO)', texto: 'HISTÓRICO DE FERRITINA BAIXA. SE OS EXAMES ATUAIS MOSTRAM FERRITINA NORMALIZADA, O TRATAMENTO FOI EFICAZ. SE A SIDEROPENIA PERSISTE, INVESTIGAR CAUSA SUBJACENTE (SANGRAMENTO OCULTO, MÁ ABSORÇÃO, DIETA INSUFICIENTE) E INTENSIFICAR A REPOSIÇÃO.' });
  }
  if (inputs.sobrecargaFerro) {
    comentarios.push({ titulo: 'EXCESSO DE FERRO / HEMOCROMATOSE (HISTÓRICO)', texto: 'HISTÓRICO DE FERRITINA ELEVADA OU HEMOCROMATOSE. SE A FERRITINA ATUAL ESTÁ NORMALIZADA, AS SANGRIAS TERAPÊUTICAS OU TRATAMENTO FORAM EFICAZES. SE PERSISTIR ELEVADA, MANTER SEGUIMENTO COM HEMATOLOGISTA E AVALIAR FREQUÊNCIA DAS SANGRIAS.' });
  }
  if (inputs.hbAlta) {
    comentarios.push({ titulo: 'HEMOGLOBINA ALTA / POLICITEMIA (HISTÓRICO)', texto: 'HISTÓRICO DE HEMOGLOBINA ELEVADA OU POLICITEMIA. SE A HEMOGLOBINA ATUAL ESTÁ NORMAL, O TRATAMENTO (SANGRIAS, HIDROXIUREIA) ESTÁ SENDO EFICAZ. SE AINDA ELEVADA, MANTER SEGUIMENTO COM HEMATOLOGISTA. PESQUISAR MUTAÇÃO JAK2 SE AINDA NÃO REALIZADO.' });
  }
  if (inputs.doadorSangue) {
    comentarios.push({ titulo: 'DOADOR DE SANGUE', texto: 'DOAÇÕES FREQUENTES DE SANGUE PODEM DEPLECIONAR AS RESERVAS DE FERRO AO LONGO DO TEMPO. CADA DOAÇÃO REMOVE APROXIMADAMENTE 200-250 MG DE FERRO. MONITORAR FERRITINA ANUALMENTE. SE FERRITINA < 50 NG/ML, AGUARDAR RECUPERAÇÃO ANTES DE NOVA DOAÇÃO.' });
  }
  if (inputs.celiaco) {
    comentarios.push({ titulo: 'DOENÇA CELÍACA', texto: 'A DOENÇA CELÍACA CAUSA MÁ ABSORÇÃO DE FERRO, ÁCIDO FÓLICO E VITAMINA B12 NO INTESTINO DELGADO. MESMO COM DIETA SEM GLÚTEN, A ABSORÇÃO PODE ESTAR COMPROMETIDA. SE HÁ ANEMIA FERROPRIVA OU MACROCÍTICA REFRATÁRIA, INVESTIGAR ADESÃO À DIETA E CONSIDERAR ANTICORPOS ANTITRANSGLUTAMINASE. FERRO ENDOVENOSO PODE SER NECESSÁRIO.' });
  }
  if (inputs.g6pd) {
    comentarios.push({ titulo: 'DEFICIÊNCIA DE G-6-PD (FAVISMO)', texto: 'A DEFICIÊNCIA DE GLICOSE-6-FOSFATO DESIDROGENASE (G-6-PD) PREDISPÕE A CRISES HEMOLÍTICAS DESENCADEADAS POR MEDICAMENTOS OXIDANTES (PRIMAQUINA, DAPSONA, NITROFURANTOÍNA, SULFAS), INFECÇÕES E INGESTÃO DE FAVA. EVITAR ESSES GATILHOS. EM CRISE HEMOLÍTICA, O PADRÃO ESPERADO É: ANEMIA COM VCM NORMAL A LEVEMENTE ELEVADO, RDW ALTO (MISTURA DE HEMÁCIAS VELHAS, RETICULÓCITOS E FRAGMENTOS) E FERRITINA NORMAL A ALTA. MONITORAR HEMOGRAMA E LDH PERIODICAMENTE.' });
  }
  if (inputs.endometriose) {
    comentarios.push({ titulo: 'ENDOMETRIOSE / MIOMAS', texto: 'ENDOMETRIOSE E MIOMAS UTERINOS SÃO CAUSAS FREQUENTES DE SANGRAMENTO EXCESSIVO E DEFICIÊNCIA DE FERRO NA MULHER. SE HÁ ANEMIA FERROPRIVA, INVESTIGAR SE O SANGRAMENTO GINECOLÓGICO É A CAUSA. O TRATAMENTO DA DOENÇA DE BASE É FUNDAMENTAL — SEM CONTROLE DO SANGRAMENTO, A REPOSIÇÃO DE FERRO SERÁ SEMPRE INSUFICIENTE.' });
  }"""

if old_anchor in engine:
    engine = engine.replace(old_anchor, new_anchor)
    print('OK engine: comentários histórico adicionados')
else:
    print('ERRO engine: âncora testosterona não encontrada')

# 2b. Modificador G-6-PD pós-matching — inserir antes do return final
old_return = """  return {
    encontrado: true,
    id: resultado.id,
    label: resultado.label,"""

new_return = """  // ── Modificador G-6-PD pós-matching ────────────────────────────────────
  let g6pdAlerta = null
  if (inputs.g6pd) {
    const idsHemoliticos = [77, 78, 79, 62, 63, 64]
    if (idsHemoliticos.includes(resultado.id)) {
      g6pdAlerta = 'DEFICIÊNCIA DE G-6-PD: O PADRÃO LABORATORIAL ATUAL É COMPATÍVEL COM CRISE HEMOLÍTICA. A G-6-PD É A CAUSA MAIS PROVÁVEL. IDENTIFICAR E ELIMINAR O GATILHO (MEDICAMENTO, INFECÇÃO OU ALIMENTO). MONITORAR LDH, BILIRRUBINAS E RETICULÓCITOS.'
    } else if (['green', 'yellow'].includes(resultado.color)) {
      g6pdAlerta = 'DEFICIÊNCIA DE G-6-PD: O ERITRON ESTÁ COMPENSADO NO MOMENTO, MAS O RISCO DE CRISE HEMOLÍTICA PERMANECE. EVITAR MEDICAMENTOS OXIDANTES (PRIMAQUINA, DAPSONA, NITROFURANTOÍNA, SULFAS) E INGESTÃO DE FAVA.'
    }
  }

  return {
    encontrado: true,
    id: resultado.id,
    label: resultado.label,"""

if old_return in engine:
    engine = engine.replace(old_return, new_return)
    print('OK engine: modificador G-6-PD adicionado')
else:
    print('ERRO engine: return final não encontrado')

# 2c. Incluir g6pdAlerta no objeto retornado
old_ret_obj = "    fraseHipermenorreia: fraseHiper,"
new_ret_obj = "    fraseHipermenorreia: fraseHiper,\n    g6pdAlerta,"

if old_ret_obj in engine:
    engine = engine.replace(old_ret_obj, new_ret_obj)
    print('OK engine: g6pdAlerta incluído no retorno')
else:
    print('ERRO engine: fraseHipermenorreia não encontrada no retorno')

with open(engine_path, 'w', encoding='utf-8') as f:
    f.write(engine)

print('Concluído.')
