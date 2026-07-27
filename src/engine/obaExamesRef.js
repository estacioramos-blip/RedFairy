// =============================================================================
// obaExamesRef.js — listas de exames do OBA (chave + rótulo + unidade +
// referência). Fonte ÚNICA compartilhada entre a UI (OBAModal.jsx, monta os
// campos do formulário de exames) e o motor de comparação longitudinal
// (obaComparador.js, rotula exames numéricos no diff) — evita duplicar ~35
// nomes em dois lugares com risco de divergência.
// =============================================================================

export const EXAMES_BASE = [
  { key: 'leucocitos',     label: "Leucócitos (Total)",       unit: '/uL',    ref: "4.000–11.000", hint: "Sem ponto ou vírgula. Ex: 7500" },
  { key: 'neutrofilos',    label: "Neutrófilos Segmentados",  unit: '%',      ref: "40–70%" },
  { key: 'neutrofilos_ul', label: "Neutrófilos (calculado)",  unit: '/uL',    ref: "1.800–7.700", readOnly: true },
  { key: 'plaquetas',      label: 'Plaquetas',                unit: "x1000/µL", ref: "150–400", hint: 'Ex: 250 = 250.000/µL' },
  { key: 'ferritina_oba',  label: 'Ferritina',                unit: 'ng/mL',  ref: "H: 24–300 / F: 25–150" },
  { key: 'vitamina_b12',   label: 'Vitamina B12',             unit: 'pg/mL',  ref: "200–900" },
  { key: 'vitamina_d',     label: 'Vitamina D', sublabel: '25-OH', unit: 'ng/mL',  ref: "30–100 (bari: >30)" },
  { key: 'tsh',            label: 'TSH',                      unit: 'mUI/L',  ref: "0,4–4,5" },
  { key: 't4_livre',       label: 'T4 Livre',                 unit: 'ng/dL',  ref: "0,7–1,8" },
  { key: 'hb_glicada',     label: 'Hb Glicada',               unit: '%',      ref: '<5,7%' },
  { key: 'glicemia',       label: 'Glicemia (jejum)',          unit: 'mg/dL',  ref: "70–99" },
  { key: 'insulina',       label: 'Insulina (jejum)',          unit: "µUI/mL", ref: "2–15" },
  { key: 'ast',            label: 'AST (TGO)',                 unit: 'U/L',    ref: 'H: <40 / F: <32' },
  { key: 'alt',            label: 'ALT (TGP)',                 unit: 'U/L',    ref: 'H: <56 / F: <35' },
  { key: 'gama_gt',        label: 'Gama-GT',                  unit: 'U/L',    ref: 'H: <61 / F: <36' },
  { key: 'ureia',          label: "Uréia",                     unit: 'mg/dL',  ref: "15–40" },
  { key: 'creatinina',     label: 'Creatinina',               unit: 'mg/dL',  ref: "H: 0,7–1,2 / F: 0,5–1,0" },
  { key: 'acido_urico',    label: "Ácido Úrico",              unit: 'mg/dL',  ref: "H: 3,4–7,0 / F: 2,4–6,0" },
  { key: 'd_dimero',       label: "D-Dímero",                 unit: 'ng/mL FEU', ref: "<500" },
  { key: 'folatos',        label: "Ácido Fólico (folato)",    unit: 'ng/mL',  ref: "4,0–20,0" },
  { key: 'zinco',          label: "Zinco sérico",              unit: "µg/dL",  ref: "70–120" },
  { key: 'pth',            label: 'PTH',                       unit: 'pg/mL',  ref: "15–65" },
  { key: 'calcio_ionico',  label: "Cálcio iônico",             unit: 'mmol/L', ref: "1,15–1,32" },
  { key: 'magnesio',       label: "Magnésio",                  unit: 'mg/dL',  ref: "1,7–2,4" },
  { key: 'colesterol_total', label: 'Colesterol Total',        unit: 'mg/dL',  ref: '<200' },
  { key: 'ldl_c',            label: 'LDL-c',                   unit: 'mg/dL',  ref: '<100' },
  { key: 'hdl_c',            label: 'HDL-c',                   unit: 'mg/dL',  ref: "M ≥40 / F ≥50" },
  { key: 'triglicerides',    label: "Triglicérides",           unit: 'mg/dL',  ref: '<150' },
  { key: 'lpa',              label: 'Lp(a)',                   unit: 'mg/dL',  ref: '<30' },
  { key: 'apob',             label: 'ApoB',                    unit: 'mg/dL',  ref: '<90' },
  { key: 'apoa',             label: 'ApoA',                    unit: 'mg/dL',  ref: "M ≥120 / F ≥140" },
  { key: 'sdldl',            label: 'sdLDL',                   unit: 'mg/dL',  ref: '<30' },
  { key: 'vitamina_a',     label: 'Vitamina A (Retinol)',      unit: "µg/dL",  ref: "20–77" },
  { key: 'vitamina_e',     label: 'Vitamina E (Tocoferol)',    unit: 'mg/L',   ref: "5–18" },
  { key: 'tiamina',        label: 'Vitamina B1', sublabel: '(Tiamina)', unit: 'nmol/L', ref: "70–180" },
  { key: 'selenio',        label: "Selênio",                   unit: "µg/L",   ref: "63–160" },
  { key: 'vitamina_c',     label: 'Vitamina C',                unit: 'mg/dL',  ref: "0,4–2,0" },
  { key: 'vitamina_k',     label: 'Vitamina K',                unit: 'ng/mL',  ref: "0,2–3,2" },
  { key: 'niacina',        label: 'Vitamina B3', sublabel: '(Niacina)', unit: "µg/mL",  ref: "0,5–8,9" },
  { key: 'testosterona',   label: 'Testosterona Total',        unit: 'ng/dL',  ref: "H: 300–1.000 / F: 15–70" },
  { key: 'prolactina',     label: 'Prolactina',                unit: 'ng/mL',  ref: "H: <15 / F: <25" },
  { key: 'ige_total',      label: 'IgE Total',                 unit: 'UI/mL',  ref: "<100" },
]

// Idade >= 45 (ambos os sexos): proteínas + globulina calculada (A/G).
export const EXAMES_45 = [
  { key: 'proteina_total', label: "Proteína Total", unit: 'g/dL', ref: "6,0–8,0" },
  { key: 'albumina',       label: 'Albumina',          unit: 'g/dL', ref: "3,5–5,2" },
  { key: 'globulina',      label: 'Globulina (calc)',  unit: 'g/dL', ref: "2,0–3,5", readOnly: true },
]

export const EXAMES_HOMEM_40 = [
  { key: 'psa_total', label: 'PSA Total', unit: 'ng/mL', ref: '<4,0' },
  { key: 'ca199',     label: 'CA 19-9',   unit: 'U/mL',  ref: '<37' },
  { key: 'cea',       label: 'CEA',       unit: 'ng/mL', ref: 'H: <5,0 / F: <3,8' },
]

export const EXAMES_MULHER_40 = [
  { key: 'cea',       label: 'CEA',       unit: 'ng/mL', ref: '<3,8' },
  { key: 'estradiol', label: 'Estradiol', unit: 'pg/mL', ref: 'varia por fase do ciclo' },
]

// Mapa chave → rótulo amigável e → unidade, juntando as 4 listas (o
// obaComparador.js usa isto para rotular exames no diff de exames numéricos).
const TODOS_EXAMES = [...EXAMES_BASE, ...EXAMES_45, ...EXAMES_HOMEM_40, ...EXAMES_MULHER_40]
export const LABEL_POR_CHAVE = Object.fromEntries(TODOS_EXAMES.map(e => [e.key, e.label]))
export const UNIT_POR_CHAVE = Object.fromEntries(TODOS_EXAMES.map(e => [e.key, e.unit || '']))
