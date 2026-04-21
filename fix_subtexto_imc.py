"""
fix_subtexto_imc.py

Adiciona subtexto 'Normal: 18.5 a 24.9' abaixo dos campos:
  - IMC antes da cirurgia
  - IMC atual

no OBAModal. Usa o mesmo padrao visual dos textos existentes
(inline style, cinza #6B7280, 0.7rem).

A faixa de normalidade 18.5-24.9 eh a referencia da OMS para
ambos os sexos (adultos).
"""

from pathlib import Path
import sys

ARQ = Path("src/components/OBAModal.jsx")
if not ARQ.exists():
    print(f"ERRO: {ARQ} nao existe.")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# FIX — Bloco IMC antes + IMC atual
# ═════════════════════════════════════════════════════════════════════
ancora = """            <div>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem' }}>IMC antes da cirurgia</label>
              <input style={inp} type="number" step="0.1" placeholder="Ex: 42" value={form.imc_antes} onChange={e => sf('imc_antes', e.target.value)} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem' }}>IMC atual</label>
              <input style={inp} type="number" step="0.1" placeholder="Ex: 28" value={form.imc_atual} onChange={e => sf('imc_atual', e.target.value)} />
            </div>"""

novo = """            <div>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem' }}>IMC antes da cirurgia</label>
              <input style={inp} type="number" step="0.1" placeholder="Ex: 42" value={form.imc_antes} onChange={e => sf('imc_antes', e.target.value)} />
              <p style={{ fontSize:'0.65rem', color:'#6B7280', marginTop:'0.25rem' }}>Normal: 18.5 a 24.9</p>
            </div>
            <div>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem' }}>IMC atual</label>
              <input style={inp} type="number" step="0.1" placeholder="Ex: 28" value={form.imc_atual} onChange={e => sf('imc_atual', e.target.value)} />
              <p style={{ fontSize:'0.65rem', color:'#6B7280', marginTop:'0.25rem' }}>Normal: 18.5 a 24.9</p>
            </div>"""

if "Normal: 18.5 a 24.9" in src:
    print("AVISO: subtexto IMC ja foi adicionado anteriormente.")
elif ancora in src:
    src = src.replace(ancora, novo, 1)
    ARQ.write_text(src, encoding="utf-8")
    print("OK: subtexto 'Normal: 18.5 a 24.9' adicionado aos 2 campos IMC.")
else:
    print("ERRO: ancora do bloco IMC nao encontrada.")
    print("     Verifique se o arquivo foi modificado desde a ultima analise.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("FIX APLICADO!")
print("=" * 60)
print(f"Arquivo: {ARQ}")
print()
print("Campos atualizados:")
print("  - IMC antes da cirurgia  -> subtexto 'Normal: 18.5 a 24.9'")
print("  - IMC atual              -> subtexto 'Normal: 18.5 a 24.9'")
print()
print("Referencia: OMS (ambos os sexos, adultos)")
print()
print("Proximo passo:")
print('  git add . && git commit -m "feat: subtexto Normal 18.5-24.9 nos campos IMC" && git push origin main')
