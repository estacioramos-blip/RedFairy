filepath = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

with open(filepath, encoding='utf-8') as f:
    txt = f.read()

# 1. Esconde o checkbox PERDI MAS GANHEI quando kgGanhou já está calculado
old1 = """          <div style={{ marginTop:'0.8rem' }}>
            <CheckRow label="PERDI MAS GANHEI PESO NOVAMENTE" checked={form.ganhou_peso_apos} onClick={() => sf('ganhou_peso_apos', !form.ganhou_peso_apos)} />
            <CheckRow label="FIZ PLASMA DE ARGÔNIO" checked={form.fez_plasma_argonio} onClick={() => sf('fez_plasma_argonio', !form.fez_plasma_argonio)} />
          </div>"""

new1 = """          <div style={{ marginTop:'0.8rem' }}>
            {!(kgGanhou !== null && kgGanhou > 0) && (
              <CheckRow label="PERDI MAS GANHEI PESO NOVAMENTE" checked={form.ganhou_peso_apos} onClick={() => sf('ganhou_peso_apos', !form.ganhou_peso_apos)} />
            )}
            <CheckRow label="FIZ PLASMA DE ARGÔNIO" checked={form.fez_plasma_argonio} onClick={() => sf('fez_plasma_argonio', !form.fez_plasma_argonio)} />
          </div>"""

# 2. No buildDadosOBA, garante ganhou_peso_apos=true quando kgGanhou>0
old2 = "      ganhou_peso_apos:   form.ganhou_peso_apos,"
new2 = "      ganhou_peso_apos:   (kgGanhou !== null && kgGanhou > 0) ? true : form.ganhou_peso_apos,"

if old1 in txt:
    txt = txt.replace(old1, new1)
    print("OK: checkbox condicional aplicado")
else:
    print("ERRO: trecho 1 não encontrado")

if old2 in txt:
    txt = txt.replace(old2, new2)
    print("OK: buildDadosOBA atualizado")
else:
    print("ERRO: trecho 2 não encontrado")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(txt)

print("Arquivo salvo.")
