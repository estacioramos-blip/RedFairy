"""
add_subtexto_parametros.py

Adiciona subtexto sob o titulo do diagnostico em ResultCard.jsx,
mostrando todos os parametros entrados pelo usuario (Hb, Ferr, VCM,
RDW, Sat, idade, sexo) e as flags ativas.

Objetivo (Dr. Ramos): facilitar testes via screenshot - ele nao
precisa redigitar o que entrou, eu vejo direto pelo print.

Layout:
  DIAGNOSTICO
  ANEMIA FERROPRIVA INCIPIENTE
  M 35a · Hb 12.1 · Ferr 15 · VCM 85 · RDW 15.7 · Sat 12
  Flags: bariatrica, metformina

Cor: branco com 70% opacidade (combina com o badge colorido do header)
"""

from pathlib import Path
import sys

ARQ = Path("src/components/ResultCard.jsx")
if not ARQ.exists():
    print(f"ERRO: {ARQ} nao existe.")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# Adicionar subtexto logo apos o <h3>{resultado.label}</h3>
# ═════════════════════════════════════════════════════════════════════
ancora = """          <div>
            <p className="text-xs uppercase tracking-widest opacity-80 mb-1">Diagnóstico</p>
            <h3 className="text-xl font-bold">{resultado.label}</h3>
          </div>"""

novo = """          <div>
            <p className="text-xs uppercase tracking-widest opacity-80 mb-1">Diagnóstico</p>
            <h3 className="text-xl font-bold">{resultado.label}</h3>
            {/* Subtexto de parametros (facilita testes via screenshot) */}
            {resultado._inputs && (() => {
              const inp = resultado._inputs
              const labs = []
              if (inp.hemoglobina !== undefined && inp.hemoglobina !== '') labs.push(`Hb ${inp.hemoglobina}`)
              if (inp.ferritina   !== undefined && inp.ferritina   !== '') labs.push(`Ferr ${inp.ferritina}`)
              if (inp.vcm         !== undefined && inp.vcm         !== '') labs.push(`VCM ${inp.vcm}`)
              if (inp.rdw         !== undefined && inp.rdw         !== '') labs.push(`RDW ${inp.rdw}`)
              if (inp.satTransf   !== undefined && inp.satTransf   !== '') labs.push(`Sat ${inp.satTransf}`)
              const cabecalho = `${inp.sexo || '?'} ${inp.idade ? inp.idade + 'a' : ''}`.trim()
              const flagsAtivas = []
              const FLAGS_MAP = {
                bariatrica: 'bariátrica', vegetariano: 'vegetariana', perda: 'perda',
                hipermenorreia: 'hipermenorreia', gestante: 'gestante', alcoolista: 'alcoolista',
                transfundido: 'transfundido', aspirina: 'aspirina', vitaminaB12: 'B12',
                ferroOral: 'ferro oral', tiroxina: 'tiroxina', hidroxiureia: 'hidroxiureia',
                anticonvulsivante: 'anticonvulsivante', testosterona: 'testosterona',
                metformina: 'metformina', ibp: 'IBP', methotrexato: 'metotrexato',
                hivTratamento: 'HIV', anemiaPrevia: 'anemia prévia', sideropenia: 'sideropenia',
                sobrecargaFerro: 'sobrecarga ferro', hbAlta: 'Hb alta prévia', celiaco: 'celíaco',
                g6pd: 'G6PD', endometriose: 'endometriose', doadorSangue: 'doador sangue'
              }
              for (const k of Object.keys(FLAGS_MAP)) {
                if (inp[k] === true) flagsAtivas.push(FLAGS_MAP[k])
              }
              return (
                <div className="text-xs opacity-75 mt-1 leading-snug">
                  <div>{cabecalho} · {labs.join(' · ')}</div>
                  <div>Flags: {flagsAtivas.length > 0 ? flagsAtivas.join(', ') : 'nenhuma'}</div>
                </div>
              )
            })()}
          </div>"""

if "Subtexto de parametros (facilita testes via screenshot)" in src:
    print("AVISO: subtexto ja foi adicionado anteriormente.")
elif ancora in src:
    src = src.replace(ancora, novo, 1)
    ARQ.write_text(src, encoding="utf-8")
    print("OK: subtexto de parametros adicionado ao header do card.")
else:
    print("ERRO: ancora do header do card nao encontrada.")
    print("     Verifique se o arquivo foi modificado desde a ultima analise.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("FIX APLICADO!")
print("=" * 60)
print(f"Arquivo: {ARQ}")
print()
print("Layout adicionado:")
print("  DIAGNOSTICO")
print("  [LABEL DO DIAGNOSTICO]")
print("  M 35a · Hb 12.1 · Ferr 15 · VCM 85 · RDW 15.7 · Sat 12")
print("  Flags: bariatrica, metformina")
print()
print("Cor: branco com 75% opacidade (combina com badge colorido)")
print()
print("Beneficio: facilita testes via screenshot - voce ve no print")
print("o que foi entrado, sem precisar redigitar.")
print()
print("Proximo passo:")
print('  git add . && git commit -m "feat: subtexto de parametros sob o diagnostico" && git push origin main')
