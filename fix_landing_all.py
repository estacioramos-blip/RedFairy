lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# ── 1. Remover TODAS as ocorrências do bloco eritrograma duplicado ────────────
bloco1 = """\n      {/* Dupla linha vermelha + texto eritrograma após Terapêutica */}\n      <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 2rem 1.5rem' }}>\n        <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginBottom:'0.6rem' }} />\n        <p style={{ color:'#1F2937', fontSize:'0.92rem', fontWeight:600, textAlign:'center', margin:'0.4rem 0 0.3rem' }}>\n          Para fazer uma avaliação você vai precisar de algumas informações do eritrograma:\n        </p>\n        <p style={{ color:'#6B7280', fontSize:'0.85rem', fontWeight:600, textAlign:'center', margin:'0 0 0.4rem' }}>\n          Hemoglobina · VCM · RDW + Ferritina e Saturação da Transferrina\n        </p>\n        <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginTop:'0.3rem' }} />\n      </div>"""

bloco2 = """          {/* Dupla linha vermelha + texto eritrograma */}\n          <div style={{ marginTop:'2rem' }}>\n            <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginBottom:'0.6rem' }} />\n            <p style={{ color:'#1F2937', fontSize:'0.92rem', fontWeight:600, textAlign:'center', margin:'0.4rem 0 0.3rem' }}>\n              Para fazer uma avaliação você vai precisar de algumas informações do eritrograma:\n            </p>\n            <p style={{ color:'#6B7280', fontSize:'0.85rem', fontWeight:600, textAlign:'center', margin:'0 0 0.4rem' }}>\n              Hemoglobina · VCM · RDW + Ferritina e Saturação da Transferrina\n            </p>\n            <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginTop:'0.3rem' }} />\n          </div>"""

for bloco in [bloco1, bloco2]:
    if bloco in txt:
        txt = txt.replace(bloco, '')
        fixed.append('OK: bloco eritrograma removido')

count = txt.count('Para fazer uma avaliação você vai precisar')
fixed.append(f'Ocorrências eritrograma restantes: {count}')

# ── 2. Remover linha Como Funciona (reward-banner substituído) ─────────────────
old_como = """                <div style={{ margin:'1rem 0' }}>
                  <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginBottom:'0.6rem' }} />
                  <p style={{ color:'#1F2937', fontSize:'0.95rem', fontWeight:600, textAlign:'center', margin:'0.4rem 0 0.2rem' }}>
                    O Programa de Afiliados RedFairy beneficia quem beneficia os seus pacientes.
                  </p>
                  <p style={{ color:'#6B7280', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', textAlign:'center', margin:'0.2rem 0 0.4rem', cursor:'pointer' }}
                     onClick={() => document.getElementById('acesso')?.scrollIntoView({ behavior:'smooth' })}>
                    CONHEÇA AS REGRAS
                  </p>
                  <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginTop:'0.3rem' }} />
                </div>"""
if old_como in txt:
    txt = txt.replace(old_como, '')
    fixed.append('OK: linha Como Funciona removida')
else:
    fixed.append('AVISO: linha Como Funciona não encontrada (pode já ter sido removida)')

# ── 3. Centralizar Indicações ─────────────────────────────────────────────────
old_ind = '          <div className="reveal">\n            <span className="tag">Indicações</span>'
new_ind = '          <div className="reveal center">\n            <span className="tag">Indicações</span>'
if old_ind in txt:
    txt = txt.replace(old_ind, new_ind)
    fixed.append('OK: Indicações centralizado')
else:
    fixed.append('ERRO: Indicações div')

# Centralizar sdesc de indicações
old_ind2 = '            <p className="sdesc">Avaliação e acompanhamento de condições clínicas relacionadas ao eritron e metabolismo do ferro.</p>'
new_ind2 = '            <p className="sdesc" style={{ margin:"0 auto" }}>Avaliação e acompanhamento de condições clínicas relacionadas ao eritron e metabolismo do ferro.</p>'
if old_ind2 in txt:
    txt = txt.replace(old_ind2, new_ind2)
    fixed.append('OK: sdesc Indicações centralizado')
else:
    fixed.append('ERRO: sdesc Indicações')

# ── 4. Centralizar Terapêutica ────────────────────────────────────────────────
old_ter = '          <div className="reveal">\n            <span className="tag">Orientações Terapêuticas</span>'
new_ter = '          <div className="reveal center">\n            <span className="tag">Orientações Terapêuticas</span>'
if old_ter in txt:
    txt = txt.replace(old_ter, new_ter)
    fixed.append('OK: Terapêutica centralizado')
else:
    fixed.append('ERRO: Terapêutica div')

# Centralizar sdesc-bold
old_ter2 = '            <p className="sdesc-bold">\n              O RedFairy é um algoritmo médico'
new_ter2 = '            <p className="sdesc-bold" style={{ margin:"0 auto" }}>\n              O RedFairy é um algoritmo médico'
if old_ter2 in txt:
    txt = txt.replace(old_ter2, new_ter2)
    fixed.append('OK: sdesc-bold Terapêutica centralizado')
else:
    fixed.append('ERRO: sdesc-bold Terapêutica')

with open(lp, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
