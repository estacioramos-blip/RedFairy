"""
add_achado_sat_transferrina_v6.py

ACHADO 7 - Sat.Transferrina > 50% - versao final limpa (sem marcas).

Decisao (Dr. Ramos):
  - Nao mencionar marcas comerciais (Noripurum, Ferinject, Monofer)
    -> evita viés, risco legal/etico, e mantem texto sobrio
  - Nao discriminar EV vs IM
    -> ambas bypassam a hepcidina igualmente
  - Termo unico: 'ferro injetavel'

Mantem toda a logica clinica:
  - Organismo nao excreta ferro
  - Suspensao nao reverte sobrecarga
  - Sangrias (~200-250 mg Fe/bolsa) como tratamento padrao
  - Quelantes se ferritina >= 1000
"""

from pathlib import Path
import sys

ARQ = Path("src/engine/achadosParalelos.js")

if not ARQ.exists():
    print(f"ERRO: arquivo nao encontrado: {ARQ.resolve()}")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# Idempotencia
if "ACHADO 7" in src or "sat-transferrina-alta" in src:
    print("AVISO: achado 7 ja existe. Nada a fazer.")
    sys.exit(0)

ancora = """  // ─────────────────────────────────────────────────────────────
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
}"""

novo = """  // ─────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────
  // ACHADO 7 — SATURAÇÃO DA TRANSFERRINA ELEVADA (> 50%)
  //
  // Observacao fisiologica fundamental:
  //   O organismo humano NAO possui mecanismo excretor significativo
  //   de ferro. Uma vez depositado nos tecidos, a suspensao da
  //   reposicao apenas IMPEDE NOVO ACUMULO — nao reverte a sobrecarga.
  //   Remocao efetiva so por SANGRIAS (~200-250 mg Fe por bolsa de
  //   400-450 mL) ou QUELANTES (deferasirox/deferiprona, indicados se
  //   ferritina > 1000 ou sangrias contraindicadas).
  //
  // Ferro ORAL raramente causa sobrecarga (regulado pela hepcidina).
  // Ferro INJETAVEL bypassa essa regulacao.
  // ─────────────────────────────────────────────────────────────
  if (satTransf > 50) {
    const satMuitoAlta = satTransf > 70;
    const ferritinaMuitoAlta = ferritina >= 1000;

    let texto = `Saturação da Transferrina de ${satTransf}% ${satMuitoAlta ? '(muito elevada)' : '(elevada, acima de 50%)'} indica maior proporção de ferro ligado à transferrina circulante. `;

    if (usaFerro) {
      texto += 'O paciente marcou uso de ferro. Fisiologicamente, o ferro ORAL tem sua absorção regulada pela hepcidina e raramente eleva a saturação ou a ferritina em organismo saudável. Já o ferro INJETÁVEL bypassa essa regulação e é causa reconhecida de sobrecarga iatrogênica. ';

      if (ferritina >= 400) {
        texto += `A ferritina também elevada (${ferritina} ng/mL) reforça a sobrecarga de ferro instalada. `;
      }

      texto += 'IMPORTANTE: a suspensão do ferro impede novo acúmulo, mas não reverte o ferro já depositado nos tecidos — o organismo humano não excreta ferro de forma significativa. ';
    } else if (ferritina >= 400) {
      texto += `A ferritina também elevada (${ferritina} ng/mL) e a ausência de história de reposição de ferro sugerem SOBRECARGA DE FERRO DE CAUSA ENDÓGENA. O padrão é compatível com HEMOCROMATOSE HEREDITÁRIA (investigar mutações HFE — C282Y e H63D). `;
    } else if (ferritina < 100) {
      texto += 'Ferritina ainda normal ou baixa apesar da saturação elevada é um padrão típico da FASE INICIAL de hemocromatose hereditária (especialmente em homens jovens). A saturação da transferrina sobe antes da ferritina. Investigar mutação HFE. ';
    } else {
      texto += 'Ferritina em faixa intermediária — pode representar fase precoce de sobrecarga. Repetir em 4-8 semanas em jejum. Se o padrão persistir, investigar mutação HFE. ';
    }

    // Conduta terapeutica quando ha sobrecarga
    if (usaFerro || ferritina >= 400) {
      texto += 'CONDUTA: a siderose confirmada impõe AVALIAÇÃO HEMATOLÓGICA. ';

      if (ferritinaMuitoAlta) {
        texto += `Com ferritina ≥ 1000 (${ferritina} ng/mL), o tratamento de eleição envolve SANGRIAS TERAPÊUTICAS periódicas e/ou QUELANTES DE FERRO (deferasirox ou deferiprona) a critério do hematologista. `;
      } else {
        texto += 'As SANGRIAS TERAPÊUTICAS são o tratamento padrão — cada bolsa de 400-450 mL remove aproximadamente 200-250 mg de ferro do organismo. ';
      }

      if (usaFerro) {
        texto += 'Suspender a reposição de ferro injetável (quando ainda em curso) é essencial para impedir piora, mas isoladamente não reverte o quadro.';
      }
    } else {
      texto += 'Recomenda-se avaliação com hematologista para investigação e acompanhamento.';
    }

    achados.push({
      id: 'sat-transferrina-alta',
      label: `SATURAÇÃO DA TRANSFERRINA ELEVADA (${satTransf}%)`,
      color: satMuitoAlta ? 'red' : 'orange',
      texto,
    });
  }

  return achados;
}"""

if ancora not in src:
    print("ERRO: ancora nao encontrada.")
    print("   Verifique se os 6 achados iniciais foram aplicados.")
    sys.exit(1)

src_novo = src.replace(ancora, novo, 1)
ARQ.write_text(src_novo, encoding="utf-8")

print("OK: ACHADO 7 (Sat.Transferrina > 50%) - v6 FINAL (sem marcas).")
print()
print("Mudancas em relacao a v5:")
print("  - REMOVIDO: 'Noripurum, Ferinject, Monofer'")
print("  - REMOVIDO: 'endovenoso ou intramuscular'")
print("  - Agora apenas: 'ferro INJETAVEL' (termo unico, sobrio)")
print()
print("Premissa fisiologica mantida:")
print("  - Organismo nao excreta ferro significativamente")
print("  - Suspensao impede novo acumulo, nao reverte")
print("  - Sangrias: ~200-250 mg Fe/bolsa de 400-450 mL")
print("  - Quelantes: considerar se ferritina >= 1000")
print()
print(f"Arquivo salvo: {ARQ.resolve()}")
print()
print("Proximo passo:")
print('  git add . && git commit -m "feat: Achado 7 - Sat>50 conduta hematologica correta" && git push origin main')
