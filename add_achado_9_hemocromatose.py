"""
add_achado_9_hemocromatose.py

Adiciona Achado Paralelo 9 — Hemocromatose Hereditaria / Siderose
Iatrogenica.

Gatilho combinado (TODOS os criterios):
  - Hb >= 17.5 (M) ou >= 16.5 (F)  -> eritrocitose
  - Ferritina >= 500 (M) ou >= 400 (F) -> hiperferritinemia
  - Sat transferrina > 50% -> sobrecarga

Titulo contextual:
  - COM ferro_injetavel marcado -> 'SIDEROSE IATROGENICA POR FERRO EV'
  - SEM ferro_injetavel -> 'SUSPEITA DE HEMOCROMATOSE HEREDITARIA'

Cor: SEMPRE vermelho (grave).
"""

from pathlib import Path
import sys

ARQ = Path("src/engine/achadosParalelos.js")
if not ARQ.exists():
    print(f"ERRO: {ARQ} nao existe."); sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# 1. Adicionar uma variavel 'usaFerroIV' logo apos a declaracao de usaFerro
# ═════════════════════════════════════════════════════════════════════
ancora_var = "  const usaFerro    = inputs.ferroOral || inputs.ferro_oral || inputs.ferro_injetavel;"
novo_var   = """  const usaFerro    = inputs.ferroOral || inputs.ferro_oral || inputs.ferro_injetavel;
  const usaFerroIV  = Boolean(inputs.ferro_injetavel);"""

if "usaFerroIV" in src:
    print("AVISO 1: variavel usaFerroIV ja existe.")
elif ancora_var in src:
    src = src.replace(ancora_var, novo_var, 1)
    print("OK 1: variavel usaFerroIV adicionada.")
else:
    print("ERRO 1: ancora de usaFerro nao encontrada."); sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
# 2. Inserir o Achado 9 logo ANTES de 'return achados;' (linha 262)
# ═════════════════════════════════════════════════════════════════════
ancora_return = """  return achados;
}"""

achado_9 = """  // ─────────────────────────────────────────────────────────────
  // ACHADO 9 — HEMOCROMATOSE HEREDITÁRIA / SIDEROSE IATROGÊNICA
  //
  // Dispara quando ha combinacao de ERITROCITOSE + HIPERFERRITINEMIA
  // + SATURACAO ELEVADA — trifeta classica de sobrecarga de ferro com
  // estimulo eritropoetico.
  //
  // Titulo contextual:
  //   - Com ferro injetavel marcado -> SIDEROSE IATROGENICA
  //   - Sem ferro injetavel -> SUSPEITA DE HEMOCROMATOSE HEREDITARIA
  // ─────────────────────────────────────────────────────────────
  {
    const limiarHbAlta = sexo === 'M' ? 17.5 : 16.5;
    const limiarFerr   = sexo === 'M' ? 500  : 400;
    const temEritrocitose    = hemoglobina >= limiarHbAlta;
    const temHiperferritinemia = ferritina   >= limiarFerr;
    const temSatAlta           = satTransf    >  50;

    if (temEritrocitose && temHiperferritinemia && temSatAlta) {
      const ehIatrogenica = usaFerroIV;

      const label = ehIatrogenica
        ? `SIDEROSE IATROGÊNICA POR FERRO ENDOVENOSO (Hb ${hemoglobina} · Ferr ${ferritina} · Sat ${satTransf}%)`
        : `SUSPEITA DE HEMOCROMATOSE HEREDITÁRIA (Hb ${hemoglobina} · Ferr ${ferritina} · Sat ${satTransf}%)`;

      let texto;
      if (ehIatrogenica) {
        texto = `Combinação de HEMOGLOBINA ELEVADA (${hemoglobina} g/dL), HIPERFERRITINEMIA (${ferritina} ng/mL) e SATURAÇÃO DA TRANSFERRINA ELEVADA (${satTransf}%) em paciente que usou FERRO ENDOVENOSO recentemente. Esse quadro é compatível com SIDEROSE IATROGÊNICA — o ferro parenteral bypassa a regulação fisiológica pela hepcidina e pode causar acúmulo marcado nos tecidos, especialmente no fígado. `;
        texto += 'CONDUTA: suspender imediatamente o ferro injetável. Solicitar avaliação com hematologista. A siderose iatrogênica costuma ser reversível com suspensão do ferro e, em casos selecionados, sangrias terapêuticas. ';
        texto += 'É importante também DESCARTAR hemocromatose hereditária subjacente (mutação HFE), especialmente quando a resposta à suspensão do ferro é incompleta ou quando há história familiar. ';
        texto += 'PRÓXIMOS EXAMES: MUTAÇÃO HFE (C282Y / H63D), FERRO HEPÁTICO POR RESSONÂNCIA MAGNÉTICA, AST, ALT, GGT, ALBUMINA, ALFAFETOPROTEÍNA, ECOCARDIOGRAMA. Investigar comprometimento hepático e cardíaco (órgãos mais afetados pelo excesso de ferro).';
      } else {
        texto = `Combinação de HEMOGLOBINA ELEVADA (${hemoglobina} g/dL), HIPERFERRITINEMIA (${ferritina} ng/mL) e SATURAÇÃO DA TRANSFERRINA ELEVADA (${satTransf}%) — trifeta clássica altamente sugestiva de HEMOCROMATOSE HEREDITÁRIA. `;
        texto += 'Na hemocromatose hereditária (forma mais comum por mutação HFE — C282Y em homozigose, ou dupla heterozigose C282Y/H63D), há absorção intestinal aumentada de ferro por defeito na regulação da hepcidina. O ferro se acumula progressivamente em fígado, coração, pâncreas, articulações e gônadas, podendo levar a cirrose, cardiomiopatia, diabetes bronzeado, artropatia e hipogonadismo. ';
        texto += 'CONDUTA: avaliação URGENTE com hematologista. O tratamento padrão é SANGRIAS TERAPÊUTICAS periódicas até ferritina-alvo < 50 ng/mL, seguidas de manutenção. Quando iniciada precocemente, a expectativa de vida é normal. ';
        texto += 'PRÓXIMOS EXAMES: MUTAÇÃO HFE (C282Y / H63D — teste genético), FERRO HEPÁTICO POR RESSONÂNCIA MAGNÉTICA (T2*), AST, ALT, GGT, ALBUMINA, ALFAFETOPROTEÍNA, GLICEMIA DE JEJUM + HBA1C (risco de diabetes), ECOCARDIOGRAMA, TESTOSTERONA TOTAL (homens), USG ABDOME. Rastrear familiares de 1º grau (irmãos, filhos).';
      }

      achados.push({
        id: 'hemocromatose-ou-siderose-iatrogenica',
        label,
        color: 'red',
        texto,
      });
    }
  }

  return achados;
}"""

if "ACHADO 9 — HEMOCROMATOSE HEREDITÁRIA" in src:
    print("AVISO 2: Achado 9 ja existe.")
elif ancora_return in src:
    src = src.replace(ancora_return, achado_9, 1)
    print("OK 2: Achado 9 (Hemocromatose / Siderose Iatrogenica) adicionado.")
else:
    print("ERRO 2: ancora do 'return achados' nao encontrada."); sys.exit(1)

ARQ.write_text(src, encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("ACHADO 9 ADICIONADO!")
print("=" * 60)
print(f"Arquivo: {ARQ}")
print()
print("GATILHO (todos simultaneamente):")
print("  - Hb >= 17.5 (M) ou >= 16.5 (F)")
print("  - Ferritina >= 500 (M) ou >= 400 (F)")
print("  - Sat transferrina > 50%")
print()
print("TITULO CONTEXTUAL:")
print("  - Com ferro_injetavel marcado: SIDEROSE IATROGENICA POR FERRO EV")
print("  - Sem ferro_injetavel:         SUSPEITA DE HEMOCROMATOSE HEREDITARIA")
print()
print("Cor: vermelho (GRAVE)")
print()
print("Teste sugerido (caso original do Dr. Ramos):")
print("  M 65a, Hb 19.8, Ferr 1090, VCM 90, RDW 13, Sat 70")
print("  -> Achado 1 (Siderose severa) + Achado 7 (Sat elevada) + Achado 9 (Hemocromatose)")
print()
print("Proximo passo:")
print('  git add . && git commit -m "feat: Achado Paralelo 9 - hemocromatose hereditaria / siderose iatrogenica" && git push origin main')
