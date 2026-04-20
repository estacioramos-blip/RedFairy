"""
achados_paralelos_full.py

Pipeline completo para implementar Achados Paralelos no RedFairy:

  1. CRIA src/engine/achadosParalelos.js (nova camada com 6 achados)
  2. MODIFICA src/engine/decisionEngine.js:
     - Importa detectarAchadosParalelos
     - Chama a funcao e anexa o array ao retorno
  3. MODIFICA src/components/ResultCard.jsx:
     - Adiciona componente AchadosParalelosSection (cards coloridos)
     - Renderiza entre o diagnostico principal e a secao OBA

Seguro: valida cada passo. Se uma ancora nao bater, para sem commit parcial.
"""

from pathlib import Path
import sys

# ═════════════════════════════════════════════════════════════════════
# PASSO 1 — Criar src/engine/achadosParalelos.js
# ═════════════════════════════════════════════════════════════════════
ACHADOS_FILE = Path("src/engine/achadosParalelos.js")
ACHADOS_FILE.parent.mkdir(parents=True, exist_ok=True)

ACHADOS_CONTENT = '''// src/engine/achadosParalelos.js
//
// ACHADOS PARALELOS — Camada de deteccao que roda em paralelo ao
// diagnostico principal (matrix.find no decisionEngine.js).
//
// Retorna um ARRAY de achados exibidos abaixo do diagnostico principal
// no ResultCard. Cada achado: { id, label, color, texto }
//   - color: 'red' (grave) | 'orange' (importante) | 'yellow' (atencao)

export function detectarAchadosParalelos(inputs) {
  const achados = [];

  const ferritina   = Number(inputs.ferritina);
  const hemoglobina = Number(inputs.hemoglobina);
  const vcm         = Number(inputs.vcm);
  const rdw         = Number(inputs.rdw);
  const satTransf   = Number(inputs.satTransf);
  const sexo        = inputs.sexo;
  const usaFerro    = inputs.ferroOral || inputs.ferro_oral;
  const usaTesto    = inputs.testosterona;
  const alcoolista  = inputs.alcoolista;
  const usaB12      = inputs.vitaminaB12 || inputs.vitamina_b12 || inputs.b12;

  // Limites de Hb normal por sexo
  const hbNormalMin = sexo === 'M' ? 13.5 : 12.0;
  const hbNormalMax = sexo === 'M' ? 17.5 : 15.5;
  const hbNormal = hemoglobina >= hbNormalMin && hemoglobina <= hbNormalMax;

  // ─────────────────────────────────────────────────────────────
  // ACHADO 1 — SIDEROSE SEVERA (Ferritina >= 1000)
  // ─────────────────────────────────────────────────────────────
  if (ferritina >= 1000) {
    let texto = `Ferritina de ${ferritina} ng/mL caracteriza SIDEROSE SEVERA (sobrecarga marcada de ferro). `;

    if (usaFerro) {
      texto += 'O uso recente ou em curso de FERRO ORAL OU INJETÁVEL (especialmente ferro parenteral em altas doses) pode explicar a elevação observada. Nesse caso, a siderose tende a ser iatrogênica e reversível após suspensão do ferro e reavaliação em 3-6 meses. Suspenda o ferro e refaça ferritina. Se persistir elevada, investigar hemocromatose hereditária (gene HFE).';
    } else if (usaTesto) {
      texto += 'O uso de testosterona ou anabolizantes pode aumentar a ferritina indiretamente via estímulo eritroide e inflamação crônica, mas raramente atinge esses níveis isoladamente. Avaliar pesquisa de HFE.';
    } else if (alcoolista) {
      texto += 'O alcoolismo crônico é causa reconhecida de hiperferritinemia por dano hepatocelular e sobrecarga hepática de ferro. Investigar função hepática (AST/ALT/GGT) e considerar HFE. Abstinência alcoólica é fundamental.';
    } else {
      texto += 'Na ausência de história de ferro exógeno ou alcoolismo, esse nível é COMPATÍVEL COM HEMOCROMATOSE HEREDITÁRIA. Avaliação urgente com hematologista para pesquisa de mutação HFE (C282Y, H63D) e avaliação da saturação da transferrina. Sangrias terapêuticas costumam ser indicadas.';
    }

    achados.push({
      id: 'siderose-severa',
      label: 'SIDEROSE SEVERA — FERRITINA ≥ 1000',
      color: 'red',
      texto,
    });
  }
  // ─────────────────────────────────────────────────────────────
  // ACHADO 2 — HIPERFERRITINEMIA MODERADA (400-999) com Hb normal
  // ─────────────────────────────────────────────────────────────
  else if (ferritina >= 400 && ferritina < 1000 && hbNormal) {
    let texto = `Ferritina de ${ferritina} ng/mL (400-999) indica HIPERFERRITINEMIA MODERADA. `;

    if (satTransf <= 45) {
      texto += 'Com saturação da transferrina normal ou baixa, as causas mais frequentes são: processo inflamatório sistêmico (PCR/VHS), obesidade, síndrome metabólica, esteatose hepática (NAFLD/NASH) e doenças crônicas. Investigar PCR, função hepática, perfil lipídico e USG de abdome.';
    } else {
      texto += 'Com saturação da transferrina elevada, considerar SIDEROSE INICIAL por sobrecarga de ferro. Avaliar necessidade de sangrias terapêuticas e pesquisa de hemocromatose se persistir.';
    }

    if (usaFerro) {
      texto += ' O uso de ferro oral/injetável pode contribuir — considerar suspensão e reavaliação.';
    }

    achados.push({
      id: 'hiperferritinemia-moderada',
      label: 'HIPERFERRITINEMIA MODERADA (400-999)',
      color: 'orange',
      texto,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // ACHADO 3 — MICROCITOSE SEM ANEMIA (VCM < 80, Hb normal)
  // ─────────────────────────────────────────────────────────────
  if (vcm < 80 && hbNormal) {
    let texto = `VCM de ${vcm} fL caracteriza MICROCITOSE, mas sem anemia (Hb normal). `;

    if (rdw <= 15) {
      texto += 'Microcitose com RDW normal (homogênea) sugere TALASSEMIA MENOR (traço talassêmico alfa ou beta). Solicitar eletroforese de hemoglobina para confirmação. Não requer tratamento, apenas aconselhamento genético se planeja gestação.';
    } else {
      texto += 'Microcitose com RDW elevado (heterogênea) sugere SIDEROPENIA INCIPIENTE, mesmo com Hb ainda normal. Avaliar ferritina e saturação da transferrina. Investigar causa (dieta, sangramento oculto).';
    }

    achados.push({
      id: 'microcitose-sem-anemia',
      label: 'MICROCITOSE SEM ANEMIA (VCM < 80)',
      color: 'yellow',
      texto,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // ACHADO 4 — MACROCITOSE SEM ANEMIA (VCM > 100, Hb normal)
  // ─────────────────────────────────────────────────────────────
  if (vcm > 100 && hbNormal) {
    let texto = `VCM de ${vcm} fL caracteriza MACROCITOSE, mas sem anemia (Hb normal). `;

    if (usaB12) {
      texto += 'O uso de B12 pode justificar parcialmente — se iniciada recentemente, a macrocitose tende a regredir. ';
    }
    if (alcoolista) {
      texto += 'O alcoolismo é causa frequente de macrocitose por efeito tóxico direto sobre a medula. Abstinência reverte. ';
    }

    texto += 'Causas a investigar: deficiência de VITAMINA B12, deficiência de FOLATOS, HIPOTIREOIDISMO (solicitar TSH/T4L), uso de medicamentos (metformina, IBP, metotrexato, anticonvulsivantes, hidroxiureia, antirretrovirais), doença hepática e síndrome mielodisplásica (se idoso).';

    achados.push({
      id: 'macrocitose-sem-anemia',
      label: 'MACROCITOSE SEM ANEMIA (VCM > 100)',
      color: 'yellow',
      texto,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // ACHADO 5 — RDW ALTO COM HB E VCM NORMAIS
  // ─────────────────────────────────────────────────────────────
  if (rdw > 15 && hbNormal && vcm >= 80 && vcm <= 100) {
    achados.push({
      id: 'rdw-alto-sem-anemia',
      label: 'ANISOCITOSE PRECOCE (RDW alto, Hb e VCM normais)',
      color: 'yellow',
      texto: `RDW de ${rdw}% indica ANISOCITOSE (heterogeneidade do tamanho das hemácias) em um momento em que a Hb e o VCM ainda estão normais. Pode ser o primeiro sinal de um processo em evolução — sideropenia incipiente, déficit de B12/folato, doença inflamatória ou resposta medular a estresse. Avaliar ferritina, saturação da transferrina, B12, folatos e reticulócitos. Reavaliar em 1-2 meses.`,
    });
  }

  // ─────────────────────────────────────────────────────────────
  // ACHADO 6 — ERITROCITOSE + TESTOSTERONA
  // ─────────────────────────────────────────────────────────────
  const hbAlta = hemoglobina > hbNormalMax;
  if (hbAlta && usaTesto) {
    achados.push({
      id: 'eritrocitose-testosterona',
      label: 'ERITROCITOSE PROVAVELMENTE SECUNDÁRIA A TESTOSTERONA',
      color: 'red',
      texto: `Hemoglobina de ${hemoglobina} g/dL (acima do normal) em uso de TESTOSTERONA ou ANABOLIZANTES. A testosterona exógena é causa comum e reversível de eritrocitose secundária, aumentando o risco de trombose, AVC e infarto. Conduta: avaliar suspensão ou redução da dose com o médico prescritor, considerar sangrias terapêuticas até hemoglobina < ${hbNormalMax} g/dL, monitorar hematócrito e PSA a cada 3-6 meses.`,
    });
  }

  return achados;
}
'''

if ACHADOS_FILE.exists():
    print(f"AVISO: {ACHADOS_FILE} ja existe. Nao sobrescrevendo.")
else:
    ACHADOS_FILE.write_text(ACHADOS_CONTENT, encoding="utf-8")
    print(f"OK 1: criado {ACHADOS_FILE} (6 achados paralelos)")

# ═════════════════════════════════════════════════════════════════════
# PASSO 2 — Modificar src/engine/decisionEngine.js
# ═════════════════════════════════════════════════════════════════════
ENGINE_FILE = Path("src/engine/decisionEngine.js")
if not ENGINE_FILE.exists():
    print(f"ERRO: {ENGINE_FILE} nao existe.")
    sys.exit(1)

engine_src = ENGINE_FILE.read_text(encoding="utf-8")

# 2a — adicionar import
imp_ancora = """import { maleMatrix } from './maleMatrix.js';
import { femaleMatrix } from './femaleMatrix.js';"""

imp_novo = """import { maleMatrix } from './maleMatrix.js';
import { femaleMatrix } from './femaleMatrix.js';
import { detectarAchadosParalelos } from './achadosParalelos.js';"""

if imp_ancora in engine_src:
    engine_src = engine_src.replace(imp_ancora, imp_novo, 1)
    print("OK 2a: import de detectarAchadosParalelos adicionado.")
elif "import { detectarAchadosParalelos }" in engine_src:
    print("AVISO 2a: import ja existe.")
else:
    print("ERRO 2a: ancora de imports nao encontrada.")
    sys.exit(1)

# 2b — anexar achadosParalelos ao retorno
# Modificamos a linha 'const resultado = matrix.find(...)' logo depois,
# calculando achados e incluindo no objeto retornado.
ret_ancora = """  return {
    encontrado: true,
    id: resultado.id,
    label: resultado.label,
    color: resultado.color,
    diagnostico: diagnosticoFinal,
    recomendacao: recomendacaoFinal,
    comentarios,
    proximosExames: resultado.proximosExames,
    fraseData,
    fraseHipermenorreia: fraseHiper,
    g6pdAlerta,
    isAge2,
    diasDesdeColeta: dias,
  };
}"""

ret_novo = """  const achadosParalelos = detectarAchadosParalelos(inputs);

  return {
    encontrado: true,
    id: resultado.id,
    label: resultado.label,
    color: resultado.color,
    diagnostico: diagnosticoFinal,
    recomendacao: recomendacaoFinal,
    comentarios,
    proximosExames: resultado.proximosExames,
    fraseData,
    fraseHipermenorreia: fraseHiper,
    g6pdAlerta,
    isAge2,
    diasDesdeColeta: dias,
    achadosParalelos,
  };
}"""

if ret_ancora in engine_src:
    engine_src = engine_src.replace(ret_ancora, ret_novo, 1)
    print("OK 2b: avaliarPaciente agora retorna achadosParalelos.")
elif "achadosParalelos," in engine_src:
    print("AVISO 2b: retorno ja inclui achadosParalelos.")
else:
    print("ERRO 2b: ancora do return nao encontrada.")
    sys.exit(1)

ENGINE_FILE.write_text(engine_src, encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# PASSO 3 — Modificar src/components/ResultCard.jsx
# ═════════════════════════════════════════════════════════════════════
CARD_FILE = Path("src/components/ResultCard.jsx")
if not CARD_FILE.exists():
    print(f"ERRO: {CARD_FILE} nao existe.")
    sys.exit(1)

card_src = CARD_FILE.read_text(encoding="utf-8")

# 3a — adicionar componente AchadosParalelosSection logo antes de OBASection
comp_ancora = """// ── Seção OBA ─────────────────────────────────────────────────────────────────
function OBASection({ oba }) {"""

comp_novo = """// ── Seção Achados Paralelos ───────────────────────────────────────────────────
function AchadosParalelosSection({ achados }) {
  const [expandido, setExpandido] = useState(null);
  if (!achados || achados.length === 0) return null;

  const schemeBy = {
    red:    { bg: 'bg-red-50',    border: 'border-red-400',    badge: 'bg-red-600',    text: 'text-red-800',    dot: 'bg-red-500',    label: '🔴 GRAVE'     },
    orange: { bg: 'bg-orange-50', border: 'border-orange-400', badge: 'bg-orange-500', text: 'text-orange-800', dot: 'bg-orange-500', label: '🟠 IMPORTANTE' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-300', badge: 'bg-yellow-500', text: 'text-yellow-800', dot: 'bg-yellow-400', label: '🟡 ATENÇÃO'   },
  };

  return (
    <div className="mt-6 rounded-2xl border-2 border-gray-300 bg-white shadow-lg overflow-hidden">
      <div className="bg-gray-700 text-white px-6 py-4">
        <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Achados Paralelos</p>
        <h3 className="text-xl font-bold">Outros Achados Relevantes</h3>
        <p className="text-gray-300 text-xs mt-1">
          {achados.length} achado{achados.length > 1 ? 's' : ''} detectado{achados.length > 1 ? 's' : ''} além do diagnóstico principal
        </p>
      </div>
      <div className="p-4 space-y-2">
        {achados.map((ach, i) => {
          const scheme = schemeBy[ach.color] || schemeBy.yellow;
          const aberto = expandido === i;
          return (
            <div key={ach.id} className={`rounded-xl border ${scheme.border} ${scheme.bg} overflow-hidden`}>
              <button
                onClick={() => setExpandido(aberto ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${scheme.dot}`} />
                  <span className={`font-semibold text-sm truncate ${scheme.text}`}>{ach.label}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white whitespace-nowrap ${scheme.badge}`}>
                    {scheme.label}
                  </span>
                  <span className={`text-xl leading-none font-light ${scheme.text} transition-transform duration-200 ${aberto ? 'rotate-90' : ''}`}>
                    ›
                  </span>
                </div>
              </button>
              {aberto && (
                <div className="px-4 pb-4 border-t border-white/60 pt-3">
                  <p className={`text-sm leading-relaxed ${scheme.text}`}>{ach.texto}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Seção OBA ─────────────────────────────────────────────────────────────────
function OBASection({ oba }) {"""

if comp_ancora in card_src:
    card_src = card_src.replace(comp_ancora, comp_novo, 1)
    print("OK 3a: componente AchadosParalelosSection adicionado.")
elif "function AchadosParalelosSection" in card_src:
    print("AVISO 3a: componente ja existe.")
else:
    print("ERRO 3a: ancora de insercao do componente nao encontrada.")
    sys.exit(1)

# 3b — renderizar AchadosParalelosSection entre a secao 1 e a OBA
rend_ancora = """      {/* ── SEÇÃO 2: OBA ─────────────────────────────────────────────────────── */}
      {oba && <OBASection oba={oba} />}"""

rend_novo = """      {/* ── SEÇÃO 1.5: ACHADOS PARALELOS ─────────────────────────────────────── */}
      <AchadosParalelosSection achados={resultado.achadosParalelos} />

      {/* ── SEÇÃO 2: OBA ─────────────────────────────────────────────────────── */}
      {oba && <OBASection oba={oba} />}"""

if rend_ancora in card_src:
    card_src = card_src.replace(rend_ancora, rend_novo, 1)
    print("OK 3b: AchadosParalelosSection renderizado entre diagnostico e OBA.")
elif "AchadosParalelosSection achados" in card_src:
    print("AVISO 3b: renderizacao ja existe.")
else:
    print("ERRO 3b: ancora de renderizacao nao encontrada.")
    sys.exit(1)

CARD_FILE.write_text(card_src, encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("TUDO OK! Arquivos modificados:")
print(f"  - {ACHADOS_FILE}  (novo)")
print(f"  - {ENGINE_FILE}   (import + return)")
print(f"  - {CARD_FILE}     (componente + renderizacao)")
print("\nProximo passo:")
print('  git add . && git commit -m "feat: Achados Paralelos (6 regras clinicas)" && git push origin main')
