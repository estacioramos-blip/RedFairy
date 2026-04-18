import re

oba_modal = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'
oba_engine = 'C:/Users/Estacio/Desktop/redfairy/src/engine/obaEngine.js'

with open(oba_modal, encoding='utf-8') as f:
    modal = f.read()

with open(oba_engine, encoding='utf-8') as f:
    engine = f.read()

# Campos extraídos do buildDadosOBA
campos = {
    # Cirurgia
    'tipo_cirurgia': 'tipo de cirurgia (Y de Roux, Sleeve, etc.)',
    'meses_pos_cirurgia': 'meses pós-cirurgia',
    # Peso
    'peso_antes': 'peso antes da cirurgia',
    'peso_atual': 'peso atual',
    'peso_minimo_pos': 'menor peso pós-cirurgia',
    'ganhou_peso_apos': 'ganhou peso após mínimo',
    'fez_plasma_argonio': 'fez plasma de argônio',
    # Status clínicos
    'status_glicemico': 'status glicêmico (diabético, dumping)',
    'status_pressorico': 'status pressórico',
    'status_osseo': 'status ósseo (densitometria)',
    'status_dental': 'status dental',
    'status_gestacional': 'status gestacional',
    'semanas_gestacao': 'semanas de gestação',
    'status_intestinal': 'status intestinal',
    'status_fibromialgia': 'status fibromiálgico (lista de sintomas)',
    # Comportamental
    'compulsoes': 'compulsões (doces, álcool, gelo, etc.)',
    'atividade_fisica': 'atividade física',
    'emagrecedores': 'medicamentos emagrecedores (Ozempic, etc.)',
    # Vascular
    'trombose': 'trombose',
    'investigou_trombose': 'investigou causas da trombose',
    'usa_anticoagulante': 'usa anticoagulante atualmente',
    'usou_anticoagulante': 'usou anticoagulante',
    'varizes': 'varizes',
    'varizes_grau': 'grau das varizes',
    'varizes_esofago': 'varizes de esôfago',
    'operou_varizes_esofago': 'operou varizes de esôfago',
    # Projeto de vida
    'meta_peso': 'meta de peso (manter/perder/ganhar)',
    'meta_kg': 'quantidade de kg da meta',
    'projetos_vida': 'projetos de vida',
    # Medicamentos eritron
    'metformina': 'metformina',
    'ibp': 'IBP (omeprazol)',
    'tiroxina': 'tiroxina',
    'methotrexato': 'metotrexato',
    'hivTratamento': 'tratamento HIV/ARV',
    # Especialistas
    'especialistas': 'especialistas que acompanham',
    'acompanhamento': 'tipo de acompanhamento médico',
    # Exames OBA
    'vitamina_b12': 'vitamina B12',
    'vitamina_d': 'vitamina D',
    'tsh': 'TSH',
    'hb_glicada': 'Hb glicada',
    'glicemia': 'glicemia',
    'insulina': 'insulina',
    'triglicerides': 'triglicérides',
    'ast': 'AST (TGO)',
    'alt': 'ALT (TGP)',
    'gama_gt': 'Gama-GT',
    'creatinina': 'creatinina',
    'acido_urico': 'ácido úrico',
    'folatos': 'folatos séricos',
    'zinco': 'zinco',
    'vitamina_a': 'vitamina A',
    'vitamina_e': 'vitamina E',
    'tiamina': 'tiamina (B1)',
    'selenio': 'selênio',
    'vitamina_c': 'vitamina C',
    'vitamina_k': 'vitamina K',
    'niacina': 'niacina (B3)',
    'testosterona': 'testosterona',
    'leucocitos': 'leucócitos',
    'neutrofilos': 'neutrófilos',
    'plaquetas': 'plaquetas',
    'ferritina_oba': 'ferritina (OBA)',
    'psa_total': 'PSA total',
    'ca199': 'CA 19-9',
    'cea': 'CEA',
    'estradiol': 'estradiol',
}

print('=' * 60)
print('CAMPOS DO OBA — TRATAMENTO NO obaEngine.js')
print('=' * 60)

tratados = []
nao_tratados = []

for campo, descricao in campos.items():
    if campo in engine:
        tratados.append((campo, descricao))
    else:
        nao_tratados.append((campo, descricao))

print(f'\n✓ TRATADOS NO ENGINE ({len(tratados)}):')
for c, d in tratados:
    print(f'  {c}: {d}')

print(f'\n✗ NÃO TRATADOS NO ENGINE ({len(nao_tratados)}):')
for c, d in nao_tratados:
    print(f'  {c}: {d}')
