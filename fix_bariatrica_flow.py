import re

# ── 1. Calculator.jsx — remover abertura automática do OBAModal ───────────────
calc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'
with open(calc_path, encoding='utf-8') as f:
    calc = f.read()

old = """    if (name === 'bariatrica') {
      if (checked) setShowOBA(true);
      else setDadosOBAColetados(null);
    }"""
new = """    if (name === 'bariatrica') {
      if (!checked) setDadosOBAColetados(null);
    }"""

if old in calc:
    calc = calc.replace(old, new)
    print('OK: OBAModal não abre mais automaticamente ao marcar Bariátrico')
else:
    print('ERRO: trecho handleChange bariatrica não encontrado')

# Adicionar Tiroxina, Metotrexato e HIV de volta ao Calculator (se foram removidos)
# Verificar se estão presentes
for field, label, sub, color in [
    ('tiroxina',      'Tiroxina / T4',   'Tratamento tireoidiano',    'teal'),
    ('methotrexato',  'Metotrexato',     'Antagonista do folato',     'purple'),
    ('hivTratamento', 'Trat. HIV / ARV', 'Antirretrovirais',          'purple'),
]:
    card = f'<CheckboxCard name="{field}"'
    if card not in calc:
        # Inserir antes do fechamento da grid de medicamentos
        anchor = '<CheckboxCard name="hidroxiureia"'
        new_card = f'              <CheckboxCard name="{field}" label="{label}" sublabel="{sub}" checked={{inputs.{field}}} onChange={{handleChange}} color="{color}" />\n              '
        if anchor in calc:
            calc = calc.replace(anchor, new_card + anchor)
            print(f'OK: {field} reinserido no Calculator')
        else:
            print(f'ERRO: ancora não encontrada para {field}')
    else:
        print(f'OK: {field} já está no Calculator')

with open(calc_path, 'w', encoding='utf-8') as f:
    f.write(calc)

# ── 2. decisionEngine.js — adicionar comentários para Tiroxina, Metotrexato, HIV ─
engine_path = 'C:/Users/Estacio/Desktop/redfairy/src/engine/decisionEngine.js'
with open(engine_path, encoding='utf-8') as f:
    engine = f.read()

old_hiv = """  if (inputs.hivTratamento) {
    comentarios.push({ titulo: 'ANTIRRETROVIRAIS (HIV)', texto: 'ALGUNS ANTIRRETROVIRAIS, ESPECIALMENTE ZIDOVUDINA (AZT), PRODUZEM MACROCITOSE E ANEMIA MEGALOBLÁSTICA POR INIBIÇÃO DA SÍNTESE DE DNA ERITROIDE. MONITORAR HEMOGRAMA E CONSIDERAR AJUSTE DO ESQUEMA COM O INFECTOLOGISTA.' });
  }"""

# Verificar se já existem — se sim, pular
if 'inputs.tiroxina' in engine:
    print('OK: comentários tiroxina/metotrexato/HIV já existem no decisionEngine')
else:
    # Adicionar após o bloco anticonvulsivante
    old_anchor = """  if (inputs.anticonvulsivante) {
    comentarios.push({ titulo: 'ANTICONVULSIVANTE', texto: 'FENITOÍNA, ÁCIDO VALPROICO E CARBAMAZEPINA PODEM INTERFERIR NO METABOLISMO DO ÁCIDO FÓLICO E PRODUZIR MACROCITOSE. AVALIAR DOSAGEM DE FOLATOS E VITAMINA B12. SUPLEMENTAÇÃO PROFILÁTICA DE ÁCIDO FÓLICO PODE SER INDICADA.' });
  }"""
    new_anchor = old_anchor + """
  if (inputs.tiroxina) {
    comentarios.push({ titulo: 'TIROXINA / T4', texto: 'O HIPOTIREOIDISMO PODE CAUSAR ANEMIA NORMOCÍTICA OU MACROCÍTICA POR REDUÇÃO DA ERITROPOESE. A REPOSIÇÃO ADEQUADA COM LEVOTIROXINA COSTUMA CORRIGIR A ANEMIA GRADUALMENTE. MONITORAR TSH E HEMOGRAMA A CADA 6 MESES ATÉ NORMALIZAÇÃO.' });
  }
  if (inputs.methotrexato) {
    comentarios.push({ titulo: 'METOTREXATO', texto: 'O METOTREXATO É UM ANTAGONISTA DO ÁCIDO FÓLICO E PODE PRODUZIR MACROCITOSE E ANEMIA MEGALOBLÁSTICA. A SUPLEMENTAÇÃO COM ÁCIDO FÓLICO (5 mg/semana, NO DIA SEGUINTE AO METOTREXATO) É PADRÃO DE CUIDADO E REDUZ A TOXICIDADE SEM COMPROMETER A EFICÁCIA TERAPÊUTICA.' });
  }
  if (inputs.hivTratamento) {
    comentarios.push({ titulo: 'ANTIRRETROVIRAIS (HIV)', texto: 'ALGUNS ANTIRRETROVIRAIS, ESPECIALMENTE ZIDOVUDINA (AZT), INIBEM A SÍNTESE DE DNA ERITROIDE E PRODUZEM MACROCITOSE E ANEMIA. O GRAU DE MACROCITOSE PODE SER USADO COMO MARCADOR INDIRETO DE ADESÃO AO TRATAMENTO. MONITORAR HEMOGRAMA E DISCUTIR AJUSTE DO ESQUEMA COM O INFECTOLOGISTA SE ANEMIA GRAVE.' });
  }"""

    if old_anchor in engine:
        engine = engine.replace(old_anchor, new_anchor)
        print('OK: comentários tiroxina/metotrexato/HIV adicionados ao decisionEngine')
    else:
        print('ERRO: âncora anticonvulsivante não encontrada no decisionEngine')

with open(engine_path, 'w', encoding='utf-8') as f:
    f.write(engine)

print('Concluído.')
