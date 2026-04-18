lp   = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'
calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

fixed = []

# ── LandingPage: salvar dados no localStorage ao clicar Acessar completo ─────
with open(lp, encoding='utf-8') as f:
    txt = f.read()

# Substituir o botão "Acessar RedFairy completo" dentro do resultado do celular
old_btn = """                      <button onClick={onModoMedico} style={{ background:'#7B1E1E', color:'white', border:'none', borderRadius:7, padding:'7px 12px', fontSize:10, cursor:'pointer', fontFamily:'inherit' }}>
                        Acessar RedFairy completo →
                      </button>"""

new_btn = """                      <button onClick={() => {
                        const hb   = document.getElementById('rf-hb2')?.value
                        const ferr = document.getElementById('rf-ferr2')?.value
                        const vcm  = document.getElementById('rf-vcm2')?.value
                        const rdw  = document.getElementById('rf-rdw2')?.value
                        const sat  = document.getElementById('rf-sat2')?.value
                        const sexo = document.getElementById('rf-sexo')?.value
                        const idade= document.getElementById('rf-idade')?.value
                        const bari = document.getElementById('rf2-bariatrica')?.checked
                        const dados = { hb, ferr, vcm, rdw, sat, sexo, idade, bariatrica: bari }
                        localStorage.setItem('rf_demo_dados', JSON.stringify(dados))
                        if (bari) localStorage.setItem('rf_flag', 'bariatrica')
                        onModoMedico()
                      }} style={{ background:'#7B1E1E', color:'white', border:'none', borderRadius:7, padding:'7px 12px', fontSize:10, cursor:'pointer', fontFamily:'inherit' }}>
                        Acessar RedFairy completo →
                      </button>"""

if old_btn in txt:
    txt = txt.replace(old_btn, new_btn)
    fixed.append('OK: botão Acessar completo salva dados no localStorage')
else:
    fixed.append('ERRO: botão Acessar completo não encontrado')

with open(lp, 'w', encoding='utf-8') as f:
    f.write(txt)

# ── Calculator: ler dados do localStorage e pré-preencher inputs ──────────────
with open(calc, encoding='utf-8') as f:
    txt = f.read()

# No useEffect que lê rf_flag, também ler rf_demo_dados
old_flag = "    const flag = localStorage.getItem('rf_flag'); if (flag) { setPreFlag(flag); localStorage.removeItem('rf_flag') }"
new_flag = """    const flag = localStorage.getItem('rf_flag'); if (flag) { setPreFlag(flag); localStorage.removeItem('rf_flag') }
    const demoDados = localStorage.getItem('rf_demo_dados')
    if (demoDados) {
      try {
        const d = JSON.parse(demoDados)
        setPreDemoDados(d)
        localStorage.removeItem('rf_demo_dados')
      } catch(e) {}
    }"""

if old_flag in txt:
    txt = txt.replace(old_flag, new_flag)
    fixed.append('OK: leitura rf_demo_dados no useEffect')
else:
    fixed.append('ERRO: âncora rf_flag não encontrada')

# Adicionar estado preDemoDados
old_preflag_state = "  const [preFlag, setPreFlag] = useState(null)"
new_preflag_state = "  const [preFlag, setPreFlag] = useState(null)\n  const [preDemoDados, setPreDemoDados] = useState(null)"
if old_preflag_state in txt:
    txt = txt.replace(old_preflag_state, new_preflag_state)
    fixed.append('OK: estado preDemoDados adicionado')
else:
    fixed.append('ERRO: estado preFlag não encontrado')

# Passar preDemoDados para CalculatorForm
old_return_calc = "  return <CalculatorForm onVoltar={onVoltar} medicoNome={medicoNome} medicoCRM={medicoCRM} onLogout={handleLogout} preFlag={preFlag} />"
new_return_calc = "  return <CalculatorForm onVoltar={onVoltar} medicoNome={medicoNome} medicoCRM={medicoCRM} onLogout={handleLogout} preFlag={preFlag} preDemoDados={preDemoDados} />"
if old_return_calc in txt:
    txt = txt.replace(old_return_calc, new_return_calc)
    fixed.append('OK: preDemoDados passado para CalculatorForm')
else:
    fixed.append('ERRO: return CalculatorForm não encontrado')

# CalculatorForm aceitar preDemoDados
old_form_sig = "function CalculatorForm({ onVoltar, medicoNome, medicoCRM, onLogout, preFlag }) {"
new_form_sig = "function CalculatorForm({ onVoltar, medicoNome, medicoCRM, onLogout, preFlag, preDemoDados }) {"
if old_form_sig in txt:
    txt = txt.replace(old_form_sig, new_form_sig)
    fixed.append('OK: CalculatorForm aceita preDemoDados')
else:
    fixed.append('ERRO: assinatura CalculatorForm não encontrada')

# Aplicar preDemoDados nos inputs via useEffect
old_resultado_state = "  const [resultado, setResultado] = useState(null);\n\n  useEffect(() => {\n    if (preFlag === 'bariatrica') {"
new_resultado_state = """  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (preDemoDados) {
      const hoje = new Date().toISOString().split('T')[0]
      setInputs(prev => ({
        ...prev,
        sexo:       preDemoDados.sexo || prev.sexo,
        idade:      preDemoDados.idade || prev.idade,
        hemoglobina: preDemoDados.hb || '',
        ferritina:   preDemoDados.ferr || '',
        vcm:         preDemoDados.vcm || '',
        rdw:         preDemoDados.rdw || '',
        satTransf:   preDemoDados.sat || '',
        dataColeta:  hoje,
        bariatrica:  preDemoDados.bariatrica || prev.bariatrica,
        bariatrica_medico: preDemoDados.bariatrica || prev.bariatrica_medico,
      }))
    }
  }, [preDemoDados]);

  useEffect(() => {
    if (preFlag === 'bariatrica') {"""

if old_resultado_state in txt:
    txt = txt.replace(old_resultado_state, new_resultado_state)
    fixed.append('OK: useEffect preDemoDados preenche inputs')
else:
    fixed.append('ERRO: âncora useEffect preFlag não encontrada')

with open(calc, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
