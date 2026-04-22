"""
fix_sangria_criterio_clinico.py

3 alteracoes em ResultCard.jsx:

1. Ampliar 'precisaSangria' com gatilho clinico objetivo:
   - Masculino: Ferritina >= 500, Sat > 50, Hb >= 13.5
   - Feminino nao-gestante: Ferritina >= 400, Sat > 50, Hb >= 12
   - Feminino gestante: NAO mostra (fisiologia impede sangria)

2. Criar variavel 'alertaGestanteSobrecarga' que detecta gestante
   com criterios de sobrecarga (mesmos da feminina, mas gestante).

3. Renderizar banner rosa antes do botao de sangria quando alerta ativo,
   com texto clinicamente correto (gestacao + lactacao consomem ~1g Fe,
   reduzem parcialmente a sobrecarga; reavaliacao no pos-parto).
"""

from pathlib import Path
import sys

ARQ = Path("src/components/ResultCard.jsx")
if not ARQ.exists():
    print(f"ERRO: {ARQ} nao existe.")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# 1. Ampliar precisaSangria + criar alertaGestanteSobrecarga
# ═════════════════════════════════════════════════════════════════════
ancora_1 = """  const precisaSangria =
    resultado.diagnostico?.toUpperCase().includes('SANGRIA TERAPÊUTICA') ||
    resultado.diagnostico?.toUpperCase().includes('SANGRIA TERAPEUTICA') ||
    resultado.diagnostico?.toUpperCase().includes('SANGRIAS TERAPÊUTICAS') ||
    resultado.diagnostico?.toUpperCase().includes('SANGRIAS TERAPEUTICAS') ||
    resultado.recomendacao?.toUpperCase().includes('SANGRIA TERAPÊUTICA') ||
    resultado.recomendacao?.toUpperCase().includes('SANGRIA TERAPEUTICA') ||
    resultado.recomendacao?.toUpperCase().includes('SANGRIAS TERAPÊUTICAS') ||
    resultado.recomendacao?.toUpperCase().includes('SANGRIAS TERAPEUTICAS');"""

novo_1 = """  // Gatilho textual (mantido)
  const _precisaSangriaTextual =
    resultado.diagnostico?.toUpperCase().includes('SANGRIA TERAPÊUTICA') ||
    resultado.diagnostico?.toUpperCase().includes('SANGRIA TERAPEUTICA') ||
    resultado.diagnostico?.toUpperCase().includes('SANGRIAS TERAPÊUTICAS') ||
    resultado.diagnostico?.toUpperCase().includes('SANGRIAS TERAPEUTICAS') ||
    resultado.recomendacao?.toUpperCase().includes('SANGRIA TERAPÊUTICA') ||
    resultado.recomendacao?.toUpperCase().includes('SANGRIA TERAPEUTICA') ||
    resultado.recomendacao?.toUpperCase().includes('SANGRIAS TERAPÊUTICAS') ||
    resultado.recomendacao?.toUpperCase().includes('SANGRIAS TERAPEUTICAS');

  // Gatilho clinico objetivo (novo — criterios do Dr. Ramos)
  const _sexoIn   = resultado._inputs?.sexo;
  const _ferrIn   = Number(resultado._inputs?.ferritina ?? 0);
  const _satIn    = Number(resultado._inputs?.satTransf ?? 0);
  const _hbIn     = Number(resultado._inputs?.hemoglobina ?? 0);
  const _gestante = Boolean(resultado._inputs?.gestante);

  const _sobrecargaMasc = _sexoIn === 'M' && _ferrIn >= 500 && _satIn > 50 && _hbIn >= 13.5;
  const _sobrecargaFem  = _sexoIn === 'F' && _ferrIn >= 400 && _satIn > 50 && _hbIn >= 12;

  // Mostra botao de sangria quando:
  //   - textual OU
  //   - sobrecarga masculina OU
  //   - sobrecarga feminina nao-gestante
  const precisaSangria = _precisaSangriaTextual || _sobrecargaMasc || (_sobrecargaFem && !_gestante);

  // Alerta especial: gestante com sobrecarga de ferro
  // Sangria e contraindicada na gestacao (risco de hipoxia fetal).
  // Gestacao + lactacao consumirao ~1 g de Fe das reservas.
  const alertaGestanteSobrecarga = _sobrecargaFem && _gestante;"""

if "_sobrecargaMasc" in src:
    print("AVISO 1: gatilho clinico ja aplicado.")
elif ancora_1 in src:
    src = src.replace(ancora_1, novo_1, 1)
    print("OK 1: precisaSangria ampliado + alertaGestanteSobrecarga criado.")
else:
    print("ERRO 1: ancora do precisaSangria nao encontrada.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
# 2. Renderizar banner rosa antes do botao de sangria
# ═════════════════════════════════════════════════════════════════════
ancora_2 = """          {precisaSangria && (
            <button onClick={() => setShowSangria(true)}
              className="w-full bg-red-900 hover:bg-red-950 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              🩸 Protocolo de Sangria Terapêutica
            </button>
          )}"""

novo_2 = """          {/* Alerta especial: gestante com sobrecarga de ferro */}
          {alertaGestanteSobrecarga && (
            <div className="rounded-xl border-2 border-pink-400 bg-pink-50 p-4 space-y-2">
              <p className="text-sm font-bold text-pink-900 uppercase tracking-wide">
                ⚠️ Sobrecarga de Ferro na Gestação
              </p>
              <p className="text-sm text-pink-900 leading-relaxed">
                A sangria terapêutica <strong>não está indicada durante a gestação</strong> — há
                risco de hipóxia fetal. A gestação e a lactação consumirão cerca de 1 g de ferro
                das suas reservas, o que reduzirá parcialmente a sobrecarga atual.
              </p>
              <p className="text-sm text-pink-900 leading-relaxed font-medium">
                <strong>Após o parto e o fim da lactação, solicite teleconsulta com hematologista
                para avaliar o status atual do seu metabolismo do ferro e decidir sobre o
                tratamento definitivo.</strong>
              </p>
            </div>
          )}

          {precisaSangria && (
            <button onClick={() => setShowSangria(true)}
              className="w-full bg-red-900 hover:bg-red-950 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              🩸 Protocolo de Sangria Terapêutica
            </button>
          )}"""

if "Sobrecarga de Ferro na Gestação" in src:
    print("AVISO 2: banner de alerta gestante ja existe.")
elif ancora_2 in src:
    src = src.replace(ancora_2, novo_2, 1)
    print("OK 2: banner rosa de alerta gestante com sobrecarga adicionado.")
else:
    print("ERRO 2: ancora do botao precisaSangria nao encontrada.")
    sys.exit(1)

ARQ.write_text(src, encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("FIX APLICADO!")
print("=" * 60)
print(f"Arquivo: {ARQ}")
print()
print("LOGICA:")
print("  Masculino:           Ferr >= 500 + Sat > 50 + Hb >= 13.5")
print("                       -> BOTAO 'Protocolo de Sangria'")
print()
print("  Feminino nao-gest.:  Ferr >= 400 + Sat > 50 + Hb >= 12")
print("                       -> BOTAO 'Protocolo de Sangria'")
print()
print("  Feminino gestante:   Ferr >= 400 + Sat > 50 + Hb >= 12")
print("                       -> BANNER ROSA (sem botao)")
print("                       'Apos parto, solicite teleconsulta...'")
print()
print("  Gatilho textual:     MANTIDO (casos que ja tinham a palavra)")
print()
print("Teste sugerido:")
print("  1. M, Hb 17, Ferr 1200, Sat 66 -> botao vermelho aparece")
print("  2. F 30a, Hb 13, Ferr 500, Sat 55 (nao-gestante) -> botao aparece")
print("  3. F 30a, gestante, Hb 12.5, Ferr 500, Sat 55 -> banner rosa, SEM botao")
print()
print("Proximo passo:")
print('  git add . && git commit -m "feat: gatilho clinico para sangria + alerta gestante" && git push origin main')
