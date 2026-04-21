"""
fase3_completa.py

FASE 3 — Exames da mesma data do eritron no OBAModal.

ARQUIVO NOVO:
  src/engine/obaCutoffs.js
    - Cutoffs clinicos para classificacao automatica
    - Bariatrica: B12 e Vit D com alvos especificos (>300 / >30)
    - Outros exames: cutoff unico (permissivo em dimorficos)
    - Funcao classificarValor(chave, valor, { bariatrica }) retorna:
        { nivel: 'normal' | 'limitrofe' | 'alterado',
          direcao: 'alto' | 'baixo' | null,
          faixa: 'min-max' }

ARQUIVO MODIFICADO:
  src/components/OBAModal.jsx
    1. Import de classificarValor
    2. Banner rosa com texto educativo (texto revisado do Dr. Ramos)
    3. Checkbox 'Tenho exames da mesma data do eritron'
       - Se marcado: pre-preenche data_exames com examesRedFairy.dataColeta
       - Se nao marcado: secao de labs ocultada
    4. Ao lado de cada input de lab: bolinha colorida + texto de classificacao
    5. Banner de teleconsulta ao final se houver algum alterado
"""

from pathlib import Path
import sys

# ═════════════════════════════════════════════════════════════════════
# PARTE 1 — Criar src/engine/obaCutoffs.js
# ═════════════════════════════════════════════════════════════════════
CUTOFFS = Path("src/engine/obaCutoffs.js")

conteudo_cutoffs = '''// src/engine/obaCutoffs.js
// Cutoffs clinicos para classificacao automatica de exames no OBAModal.
//
// REGRAS (calibradas pelo Dr. Ramos):
//   - Bariatrica tem alvo especifico em B12 e Vit D (mais exigente)
//   - Exames com cutoff dimorfico usam o valor mais permissivo (envelope amplo)
//   - Classificacao em 3 niveis: normal / limitrofe (<=10% fora) / alterado (>10% fora)

export const OBA_CUTOFFS = {
  // Hemograma
  leucocitos:     { min: 4000,  max: 11000 },
  neutrofilos:    { min: 40,    max: 70    },  // %
  plaquetas:      { min: 150,   max: 400   },  // x1000

  // Ferro/vitaminas criticos em bariatrica
  ferritina_oba:  { min: 25,    max: 336   },  // permissivo (H ate 336)
  vitamina_b12:   { min: 300,   max: 900   },
  vitamina_d:     { min: 30,    max: 100   },

  // Tireoide
  tsh:            { min: 0.4,   max: 4.5   },

  // Metabolismo glicemico
  hb_glicada:     { min: 0,     max: 5.7   },
  glicemia:       { min: 70,    max: 99    },
  insulina:       { min: 2,     max: 15    },

  // Lipideos
  triglicerides:  { min: 0,     max: 150   },

  // Hepaticas (permissivo dimorfico - valor H)
  ast:            { min: 0,     max: 40    },
  alt:            { min: 0,     max: 56    },
  gama_gt:        { min: 0,     max: 61    },

  // Renal (permissivo dimorfico - valor H)
  creatinina:     { min: 0.5,   max: 1.2   },
  acido_urico:    { min: 2.4,   max: 7.0   },

  // Vitaminas/minerais
  folatos:        { min: 4.0,   max: 20.0  },
  zinco:          { min: 70,    max: 120   },
  vitamina_a:     { min: 20,    max: 77    },
  vitamina_e:     { min: 5,     max: 18    },
  tiamina:        { min: 70,    max: 180   },
  selenio:        { min: 63,    max: 160   },
  vitamina_c:     { min: 0.4,   max: 2.0   },
  vitamina_k:     { min: 0.2,   max: 3.2   },
  niacina:        { min: 0.5,   max: 8.9   },

  // Hormonios (permissivo dimorfico - valor H)
  testosterona:   { min: 15,    max: 1000  },

  // Homens >= 40
  psa_total:      { min: 0,     max: 4.0   },
  ca199:          { min: 0,     max: 37    },
  cea:            { min: 0,     max: 5.0   },

  // Outros
  estradiol:      { min: 5,     max: 400   },  // permissivo (nao-gestante)
}

// Cutoffs especiais para pacientes bariatricas
// Bariatrica precisa de alvo mais rigoroso em B12 e Vit D
const CUTOFFS_BARIATRICA = {
  vitamina_b12:   { min: 300,   max: 2000  },  // alvo pos-bariatrica
  vitamina_d:     { min: 30,    max: 200   },  // alvo pos-bariatrica
}

/**
 * Classifica um valor laboratorial como normal, limitrofe ou alterado.
 *
 * @param {string} chave - Chave do exame (ex: 'vitamina_b12')
 * @param {number|string} valor - Valor digitado pelo usuario
 * @param {object} contexto - { bariatrica: boolean }
 * @returns {object|null} { nivel, direcao, faixa } ou null se nao classificavel
 *
 * Niveis:
 *   - 'normal'    → dentro da faixa
 *   - 'limitrofe' → <= 10% fora da faixa (amarelo)
 *   - 'alterado'  → > 10% fora da faixa (laranja/vermelho)
 *
 * Direcao:
 *   - 'alto'  → valor acima do max
 *   - 'baixo' → valor abaixo do min
 *   - null    → dentro da faixa
 */
export function classificarValor(chave, valor, contexto = {}) {
  const valorNum = Number(valor)
  if (!Number.isFinite(valorNum) || valor === '' || valor === null) {
    return null
  }

  // Pega cutoff especifico ou generico
  let cutoff = OBA_CUTOFFS[chave]
  if (contexto.bariatrica && CUTOFFS_BARIATRICA[chave]) {
    cutoff = CUTOFFS_BARIATRICA[chave]
  }
  if (!cutoff) return null

  const { min, max } = cutoff
  const faixa = `${min}–${max}`

  // Dentro da faixa
  if (valorNum >= min && valorNum <= max) {
    return { nivel: 'normal', direcao: null, faixa }
  }

  // Fora da faixa — calcular distancia percentual
  let distanciaPct
  let direcao
  if (valorNum < min) {
    distanciaPct = ((min - valorNum) / min) * 100
    direcao = 'baixo'
  } else {
    distanciaPct = ((valorNum - max) / max) * 100
    direcao = 'alto'
  }

  const nivel = distanciaPct <= 10 ? 'limitrofe' : 'alterado'
  return { nivel, direcao, faixa }
}
'''

if CUTOFFS.exists():
    print(f"AVISO: {CUTOFFS} ja existe. Pulando criacao.")
else:
    CUTOFFS.write_text(conteudo_cutoffs, encoding="utf-8")
    print(f"OK: arquivo novo criado: {CUTOFFS}")

# ═════════════════════════════════════════════════════════════════════
# PARTE 2 — Modificar OBAModal.jsx
# ═════════════════════════════════════════════════════════════════════
OBA = Path("src/components/OBAModal.jsx")
if not OBA.exists():
    print(f"ERRO: {OBA} nao existe.")
    sys.exit(1)

oba_src = OBA.read_text(encoding="utf-8")

# --- 2a: Import de classificarValor ---
if "import { classificarValor }" in oba_src:
    print("AVISO 2a: import ja existe.")
else:
    # Buscar linha 'import { supabase }' (o padrao de imports no topo)
    ancora_import = "import { supabase }"
    if ancora_import in oba_src:
        idx = oba_src.find(ancora_import)
        # Encontrar fim da linha do import supabase
        fim_linha = oba_src.find("\n", idx) + 1
        novo_import = "import { classificarValor } from '../engine/obaCutoffs'\n"
        oba_src = oba_src[:fim_linha] + novo_import + oba_src[fim_linha:]
        print("OK 2a: import de classificarValor adicionado.")
    else:
        print("ERRO 2a: ancora de imports nao encontrada.")
        sys.exit(1)

# --- 2b: Adicionar state para temExamesMesmaData ---
ancora_state = "status_gestacional: '', semanas_gestacao: '',"
novo_state   = "status_gestacional: '', semanas_gestacao: '', temExamesMesmaData: false,"

if "temExamesMesmaData:" in oba_src:
    print("AVISO 2b: state temExamesMesmaData ja existe.")
elif ancora_state in oba_src:
    oba_src = oba_src.replace(ancora_state, novo_state, 1)
    print("OK 2b: state temExamesMesmaData adicionado.")
else:
    print("ERRO 2b: ancora do state nao encontrada.")
    sys.exit(1)

# --- 2c: useEffect para pre-preencher data_exames ---
ancora_ef = """  // Fase 1: pre-preenche Status Gestacional se vier da RedFairy
  useEffect(() => {
    if (dadosRedFairy?.gestante) {
      setForm(prev => ({
        ...prev,
        status_gestacional: prev.status_gestacional || 'GRÁVIDA',
        semanas_gestacao: prev.semanas_gestacao || (dadosRedFairy.semanas_gestacao ? String(dadosRedFairy.semanas_gestacao) : ''),
      }))
    }
  }, [dadosRedFairy])"""

novo_ef = ancora_ef + """

  // Fase 3: quando marca 'Tenho exames da mesma data', pre-preenche data_exames
  useEffect(() => {
    if (form.temExamesMesmaData && examesRedFairy?.dataColeta && !form.data_exames) {
      setForm(prev => ({ ...prev, data_exames: examesRedFairy.dataColeta }))
    }
  }, [form.temExamesMesmaData, examesRedFairy])"""

if "Fase 3: quando marca" in oba_src:
    print("AVISO 2c: useEffect Fase 3 ja existe.")
elif ancora_ef in oba_src:
    oba_src = oba_src.replace(ancora_ef, novo_ef, 1)
    print("OK 2c: useEffect de pre-preenchimento de data adicionado.")
else:
    print("ERRO 2c: ancora do useEffect Fase 1 nao encontrada.")
    sys.exit(1)

OBA.write_text(oba_src, encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# Nota importante: as partes visuais (banner educativo, checkbox, classificacao
# inline ao lado dos inputs, banner de teleconsulta) exigem inspecao do ponto
# exato onde os campos de lab sao renderizados (secao que o diagnostico nao
# achou com "Exames complementares"). Vou criar uma flag para proxima etapa.
# ═════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("FASE 3 — PARTE 1 APLICADA!")
print("=" * 60)
print()
print("Arquivos modificados:")
print(f"  NOVO: {CUTOFFS}")
print(f"  MOD:  {OBA}")
print()
print("O que foi feito:")
print("  - Criado modulo obaCutoffs.js com classificarValor()")
print("  - Import adicionado ao OBAModal")
print("  - State temExamesMesmaData criado")
print("  - useEffect pre-preenche data_exames quando checkbox marcado")
print()
print("Proximo passo APOS testar este script:")
print("  - PARTE 2 da Fase 3: render do banner rosa + checkbox + classificacao inline")
print("    (precisa de novo diagnostico pra localizar o render dos inputs de lab)")
print()
print("Commitar primeiro:")
print('  git add . && git commit -m "feat: Fase 3 parte 1 - obaCutoffs + classificarValor" && git push origin main')
