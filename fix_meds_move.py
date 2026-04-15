calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'
oba_path  = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

# ── Calculator.jsx — remover Metformina, IBP, Tiroxina, Metotrexato, HIV ─────
with open(calc_path, encoding='utf-8') as f:
    calc = f.read()

# Remover os 5 CheckboxCards do Calculator
remover = [
    """              <CheckboxCard name="metformina" label="Metformina" sublabel="Reduz absorção de B12" checked={inputs.metformina} onChange={handleChange} color="blue" />""",
    """              <CheckboxCard name="ibp" label="IBP (Omeprazol etc.)" sublabel="Pantoprazol, Omeprazol — reduz B12" checked={inputs.ibp} onChange={handleChange} color="blue" />""",
    """              <CheckboxCard name="tiroxina" label="Tiroxina / T4" sublabel="Tratamento tireoidiano" checked={inputs.tiroxina} onChange={handleChange} color="teal" />""",
    """              <CheckboxCard name="methotrexato" label="Metotrexato" sublabel="Antagonista do folato" checked={inputs.methotrexato} onChange={handleChange} color="purple" />""",
    """              <CheckboxCard name="hivTratamento" label="Trat. HIV / ARV" sublabel="Antirretrovirais" checked={inputs.hivTratamento} onChange={handleChange} color="purple" />""",
]

fixed_calc = []
for item in remover:
    if item in calc:
        calc = calc.replace(item + '\n', '')
        if item in calc:
            calc = calc.replace(item, '')
        fixed_calc.append(f'OK: removido {item[30:60].strip()}...')
    else:
        fixed_calc.append(f'ERRO: nao encontrado {item[30:60].strip()}...')

with open(calc_path, 'w', encoding='utf-8') as f:
    f.write(calc)

for msg in fixed_calc:
    print(msg)

# ── OBAModal.jsx — adicionar seção de medicamentos adicionais ─────────────────
with open(oba_path, encoding='utf-8') as f:
    oba = f.read()

# Inserir antes da seção de Emagrecedores
old_emag = "          {/* ── EMAGRECEDORES ── */"
new_emag = """          {/* ── MEDICAMENTOS ADICIONAIS ── */}
          <SectionTitle>Medicamentos que Afetam o Eritron</SectionTitle>
          <p style={{ fontSize:'0.75rem', color:'#6B7280', marginBottom:'0.6rem' }}>Marque os que usa ou usou nos últimos 2 anos:</p>
          {[
            { field: 'metformina',    label: 'Metformina',           sub: 'Reduz absorção de vitamina B12' },
            { field: 'ibp',           label: 'IBP (Omeprazol etc.)', sub: 'Pantoprazol, Omeprazol — reduz B12' },
            { field: 'tiroxina',      label: 'Tiroxina / T4',        sub: 'Hipotireoidismo — pode causar anemia' },
            { field: 'methotrexato',  label: 'Metotrexato',          sub: 'Antagonista do folato — causa macrocitose' },
            { field: 'hivTratamento', label: 'Trat. HIV / ARV',      sub: 'AZT e outros — podem causar macrocitose' },
          ].map(({ field, label, sub }) => (
            <CheckRow key={field}
              label={label + ' — ' + sub}
              checked={!!form[field]}
              onClick={() => sf(field, !form[field])} />
          ))}

          {/* ── EMAGRECEDORES ── */}"""

if old_emag in oba:
    oba = oba.replace(old_emag, new_emag)
    print('OK: seção medicamentos adicionais inserida no OBAModal')
else:
    print('ERRO: âncora emagrecedores não encontrada')

# Adicionar campos no estado inicial do form
old_form = "    ganhou_peso_apos: false, fez_plasma_argonio: false,"
new_form = "    ganhou_peso_apos: false, fez_plasma_argonio: false,\n    metformina: false, ibp: false, tiroxina: false, methotrexato: false, hivTratamento: false,"

if old_form in oba:
    oba = oba.replace(old_form, new_form)
    print('OK: campos adicionados ao estado form')
else:
    print('ERRO: estado form não encontrado')

# Adicionar campos no buildDadosOBA
old_build = "      projetos_vida:      form.projetos_vida,"
new_build = """      projetos_vida:      form.projetos_vida,
      metformina:         form.metformina,
      ibp:                form.ibp,
      tiroxina:           form.tiroxina,
      methotrexato:       form.methotrexato,
      hivTratamento:      form.hivTratamento,"""

if old_build in oba:
    oba = oba.replace(old_build, new_build)
    print('OK: campos adicionados ao buildDadosOBA')
else:
    print('ERRO: buildDadosOBA não encontrado')

with open(oba_path, 'w', encoding='utf-8') as f:
    f.write(oba)

print('Concluído.')
