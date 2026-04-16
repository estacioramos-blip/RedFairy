oba_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

with open(oba_path, encoding='utf-8') as f:
    txt = f.read()

# 1. Adicionar constantes
old_const = "const EMAGRECEDORES = ['Ozempic', 'Rybelsus', 'Wegovy', 'Mounjaro', 'Saxenda', 'Victoza', 'Trulicity', 'Xultophi']"
new_const = """const EMAGRECEDORES = ['Ozempic', 'Rybelsus', 'Wegovy', 'Mounjaro', 'Saxenda', 'Victoza', 'Trulicity', 'Xultophi']

const STATUS_INTESTINAL_OPS = [
  'INTESTINO FUNCIONA BEM',
  'OBSTIPAÇÃO CRÔNICA (PRISÃO DE VENTRE)',
  'INTESTINO IRRITÁVEL (DIARREIA FREQUENTE)',
]

const STATUS_FIBROMIALGIA_OPS = [
  'FUI DIAGNOSTICADO COM FIBROMIALGIA',
  'DORES NO CORPO',
  'DOR DE CABEÇA / ENXAQUECAS',
  'INSÔNIA',
  'PROBLEMAS DE MEMÓRIA',
  'DIFICULDADE DE CONCENTRAÇÃO',
  'DEPRESSÃO OU MELANCOLIA',
  'ZUMBIDOS',
  'DESEQUILÍBRIO',
  'VARIAÇÃO DO HUMOR',
  'SINTO FRIO OU CALOR EXCESSIVO',
]"""

if old_const in txt:
    txt = txt.replace(old_const, new_const)
    print('OK: constantes adicionadas')
else:
    print('ERRO: constante EMAGRECEDORES não encontrada')

# 2. Adicionar campos no estado do form
old_state = "    metformina: false, ibp: false, tiroxina: false, methotrexato: false, hivTratamento: false,"
new_state = "    metformina: false, ibp: false, tiroxina: false, methotrexato: false, hivTratamento: false,\n    status_intestinal: '', status_fibromialgia: [],"

if old_state in txt:
    txt = txt.replace(old_state, new_state)
    print('OK: campos adicionados ao estado')
else:
    print('ERRO: estado form não encontrado')

# 3. Adicionar no buildDadosOBA
old_build = "      metformina:         form.metformina,"
new_build = """      status_intestinal:  form.status_intestinal || null,
      status_fibromialgia: form.status_fibromialgia,
      metformina:         form.metformina,"""

if old_build in txt:
    txt = txt.replace(old_build, new_build)
    print('OK: campos adicionados ao buildDadosOBA')
else:
    print('ERRO: buildDadosOBA não encontrado')

# 4. Inserir seções no JSX — antes da seção COVID
old_covid = "          {/* ── STATUS COVID ── */}"
new_covid = """          {/* ── STATUS INTESTINAL ── */}
          <SectionTitle>Status Intestinal</SectionTitle>
          <RadioGroup options={STATUS_INTESTINAL_OPS} value={form.status_intestinal} onChange={v => sf('status_intestinal', form.status_intestinal === v ? '' : v)} />

          {/* ── STATUS FIBROMIÁLGICO ── */}
          <SectionTitle>Status Fibromiálgico</SectionTitle>
          <p style={{ fontSize:'0.75rem', color:'#6B7280', marginBottom:'0.5rem' }}>Marque os sintomas que apresenta com frequência:</p>
          {STATUS_FIBROMIALGIA_OPS.map(op => (
            <CheckRow key={op} label={op}
              checked={form.status_fibromialgia.includes(op)}
              onClick={() => sf('status_fibromialgia', tog(form.status_fibromialgia, op))} />
          ))}

          {/* ── STATUS COVID ── */}"""

if old_covid in txt:
    txt = txt.replace(old_covid, new_covid)
    print('OK: seções inseridas no JSX')
else:
    print('ERRO: âncora STATUS COVID não encontrada')

with open(oba_path, 'w', encoding='utf-8') as f:
    f.write(txt)

print('Concluído.')
