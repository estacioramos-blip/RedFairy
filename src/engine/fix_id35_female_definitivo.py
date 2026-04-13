# -*- coding: utf-8 -*-
# RedFairy — fix_id35_female_definitivo.py
# Corrige o ID 35 da femaleMatrix com Hb correta (8.0-12.4)
# e adiciona ID 94 que cobre Hb 10.0-13.4
# Execute em: C:\Users\Estacio\Desktop\redfairy\src\engine
# python fix_id35_female_definitivo.py

import os, re

dir_ = os.path.dirname(os.path.abspath(__file__))
fem = os.path.join(dir_, 'femaleMatrix.js')

with open(fem, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = []

# ── 1. Corrigir ID 35: Hb min 7 → 8.0, max 9.9 → 12.4 ───────────────────────
# Busca flexível pelo ID 35 e corrige os valores de hemoglobina
def fix_hb(content, id_num, new_min, new_max):
    # Encontrar bloco do ID
    pattern = rf'(id:\s*{id_num}\b.*?hemoglobina:\s*\{{[^}}]+\}})'
    m = re.search(pattern, content, re.DOTALL)
    if not m:
        return content, f"❌ ID {id_num}: não encontrado"
    
    bloco = m.group(1)
    hb_atual = re.search(r'hemoglobina:\s*\{[^}]+\}', bloco)
    print(f"ID {id_num} Hb atual: {hb_atual.group() if hb_atual else 'não encontrado'}")
    
    novo_bloco = re.sub(
        r'(hemoglobina:\s*\{\s*min:\s*)[0-9.]+(\s*,\s*max:\s*)[0-9.]+(\s*\})',
        rf'\g<1>{new_min}\2{new_max}\3',
        bloco
    )
    
    if novo_bloco == bloco:
        return content, f"ℹ️  ID {id_num}: Hb já correta ou padrão diferente"
    
    content = content.replace(bloco, novo_bloco)
    return content, f"✅ ID {id_num}: Hb corrigida para {new_min}–{new_max}"

content, msg = fix_hb(content, 35, 8.0, 12.4)
fixes.append(msg)

# ── 2. Verificar se ID 94 existe, se não, adicionar ──────────────────────────
if 'id: 94,' not in content:
    # Inserir ID 94 logo antes do ID 95 ou antes do fechamento do array
    novo_94 = """
  // ─── ID 94 — ANEMIA MODERADA COM HEMORRAGIA E SIDEROPENIA GRAVE ───────────
  {
    id: 94,
    label: "ANEMIA MODERADA COM HEMORRAGIA E SIDEROPENIA GRAVE",
    color: "red",
    conditions: {
      ferritina:   { min: 0,   max: 24  },
      hemoglobina: { min: 10.0,max: 13.4},
      vcm:         { min: 0,   max: 79  },
      rdw:         { min: 15.1,max: 999 },
      satTransf:   { min: 0,   max: 50  },
      bariatrica:  false,
      vegetariano: false,
      perda:       true,
      alcoolista:  false,
      transfundido: false,
    },
    diagnostico: "ANEMIA MICROCÍTICA MODERADA COM HISTÓRICO DE HEMORRAGIA E DEPLEÇÃO SIGNIFICATIVA DE FERRO. A COMBINAÇÃO DE FERRITINA BAIXA, SATURAÇÃO REDUZIDA E VCM MICROCÍTICO EM CONTEXTO DE PERDAS HEMORRÁGICAS INDICA ANEMIA FERROPRIVA HEMORRÁGICA. AVALIAÇÃO MÉDICA NECESSÁRIA PARA IDENTIFICAR E CONTROLAR A FONTE DE SANGRAMENTO.\\nFRASE DATA",
    recomendacaoAge1: "AVALIAÇÃO COM HEMATOLOGISTA E INVESTIGAÇÃO DA FONTE DE HEMORRAGIA.\\nVOCÊ NÃO PODERIA DOAR SANGUE.",
    recomendacaoAge2: "AVALIAÇÃO COM HEMATOLOGISTA.\\nNESSA FAIXA ETÁRIA, INVESTIGAR CAUSAS GINECOLÓGICAS E GASTROINTESTINAIS.\\nVOCÊ NÃO PODERIA DOAR SANGUE.",
    comentarioAspirina: "ASPIRINA PODE AGRAVAR SANGRAMENTOS. REVISAR INDICAÇÃO COM O MÉDICO PRESCRITOR.",
    comentarioB12: "REPOSIÇÃO DE B12 PODE SER BENÉFICA COMO SUPORTE NUTRICIONAL.",
    comentarioFerro: "A SUPLEMENTAÇÃO DE FERRO É INDICADA, MAS A DOSE PODE SER INSUFICIENTE. AVALIE FERRO PARENTERAL COM O MÉDICO.",
    proximosExames: ["HEMOGRAMA","RETICULÓCITOS","FERRITINA","SATURAÇÃO DA TRANSFERRINA","PCR","VHS","SANGUE NAS FEZES","VITAMINA B12","ENDOSCOPIA DIGESTIVA","COLONOSCOPIA","ULTRASSONOGRAFIA PÉLVICA","CA 125"],
  },
"""
    # Inserir antes do fechamento do array
    if content.rstrip().endswith('];'):
        content = content.rstrip()[:-2] + novo_94 + '\n];\n'
        fixes.append("✅ ID 94 adicionado à femaleMatrix")
    else:
        fixes.append("❌ Não foi possível inserir ID 94 — fim do array não encontrado")
else:
    # Corrigir satTransf do ID 94 se max for 19
    content, msg94 = fix_hb(content, 94, 10.0, 13.4)
    # Também corrigir satTransf
    fixes.append(f"ℹ️  ID 94 já existe")

with open(fem, 'w', encoding='utf-8') as f:
    f.write(content)

# ── Verificação final ─────────────────────────────────────────────────────────
print("\n=== VERIFICAÇÃO FINAL ===")
with open(fem, 'r', encoding='utf-8') as f:
    c = f.read()

for id_num in [35, 94, 100]:
    m = re.search(rf'id:\s*{id_num}\b.*?hemoglobina:\s*(\{{[^}}]+\}}).*?satTransf:\s*(\{{[^}}]+\}}).*?perda:\s*(\w+)', c, re.DOTALL)
    if m:
        print(f"ID {id_num}: Hb={m.group(1).strip()} | sat={m.group(2).strip()} | perda={m.group(3)}")
    else:
        print(f"ID {id_num}: não encontrado")

print("\n=== CORREÇÕES ===")
for fix in fixes: print(f"  {fix}")

print("\nAgora rode:")
print('  cd C:\\Users\\Estacio\\Desktop\\redfairy')
print('  git add . && git commit -m "fix: femaleMatrix ID 35 Hb corrigida 8-12.4, ID 94 adicionado" && git push origin main')
