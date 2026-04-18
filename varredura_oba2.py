engine_path = 'C:/Users/Estacio/Desktop/redfairy/src/engine/obaEngine.js'

with open(engine_path, encoding='utf-8') as f:
    engine = f.read()

campos = {
    # Cirurgia
    'tipo_cirurgia':        'tipo de cirurgia',
    'meses_pos_cirurgia':   'meses pós-cirurgia',
    # Peso
    'peso_antes':           'peso antes',
    'peso_atual':           'peso atual',
    'peso_minimo_pos':      'menor peso pós-op',
    'ganhou_peso_apos':     'reganhou peso',
    'fez_plasma_argonio':   'plasma de argônio',
    # Status clínicos
    'status_glicemico':     'status glicêmico',
    'status_pressorico':    'status pressórico',
    'status_osseo':         'status ósseo',
    'status_dental':        'status dental',
    'status_gestacional':   'status gestacional',
    'semanas_gestacao':     'semanas de gestação',
    'status_intestinal':    'status intestinal',
    'status_fibromialgia':  'status fibromiálgico',
    # Comportamental
    'compulsoes':           'compulsões',
    'atividade_fisica':     'atividade física',
    'emagrecedores':        'emagrecedores',
    # Vascular
    'trombose':             'trombose',
    'investigou_trombose':  'investigou trombose',
    'usa_anticoagulante':   'usa anticoagulante',
    'usou_anticoagulante':  'usou anticoagulante',
    'varizes':              'varizes',
    'varizes_grau':         'grau varizes',
    'varizes_esofago':      'varizes esôfago',
    'operou_varizes_esofago': 'operou varizes esôfago',
    # Projeto de vida
    'meta_peso':            'meta de peso',
    'meta_kg':              'kg da meta',
    'projetos_vida':        'projetos de vida',
    # Medicamentos eritron
    'metformina':           'metformina',
    'ibp':                  'IBP',
    'tiroxina':             'tiroxina',
    'methotrexato':         'metotrexato',
    'hivTratamento':        'HIV/ARV',
    # Especialistas/acompanhamento
    'especialistas':        'especialistas',
    'acompanhamento':       'acompanhamento médico',
    'semEspecialista':      'sem especialista',
    # Exames laboratoriais
    'vitamina_b12':         'vitamina B12',
    'vitamina_d':           'vitamina D',
    'tsh':                  'TSH',
    'hb_glicada':           'Hb glicada',
    'glicemia':             'glicemia',
    'insulina':             'insulina',
    'triglicerides':        'triglicérides',
    'ast':                  'AST',
    'alt':                  'ALT',
    'gama_gt':              'Gama-GT',
    'creatinina':           'creatinina',
    'acido_urico':          'ácido úrico',
    'folatos':              'folatos',
    'zinco':                'zinco',
    'vitamina_a':           'vitamina A',
    'vitamina_e':           'vitamina E',
    'tiamina':              'tiamina',
    'selenio':              'selênio',
    'vitamina_c':           'vitamina C',
    'vitamina_k':           'vitamina K',
    'niacina':              'niacina',
    'testosterona':         'testosterona',
    'leucocitos':           'leucócitos',
    'neutrofilos':          'neutrófilos',
    'neutrofilos_ul':       'neutrófilos absoluto',
    'plaquetas':            'plaquetas',
    'ferritina_oba':        'ferritina OBA',
    'psa_total':            'PSA total',
    'ca199':                'CA 19-9',
    'cea':                  'CEA',
    'estradiol':            'estradiol',
}

print('=' * 60)
print('VARREDURA OBA — CAMPOS vs ENGINE')
print('=' * 60)

tratados = []
nao_tratados = []

for campo, desc in campos.items():
    if campo in engine:
        tratados.append((campo, desc))
    else:
        nao_tratados.append((campo, desc))

print(f'\n✓ TRATADOS ({len(tratados)}):')
for c, d in tratados:
    print(f'  {c}: {d}')

print(f'\n✗ NÃO TRATADOS ({len(nao_tratados)}):')
for c, d in nao_tratados:
    print(f'  {c}: {d}')

print(f'\nTotal: {len(campos)} campos | Tratados: {len(tratados)} | Pendentes: {len(nao_tratados)}')
