oba  = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'
lp   = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

fixed = []

# ── 1. OBAModal: botão Voltar no topo do Header ───────────────────────────────
with open(oba, encoding='utf-8') as f:
    txt = f.read()

old_hd = """  const Header = ({ sub }) => (
    <div style={HD}>
      <img src={logo} alt="OBA" style={{ width:48, height:48, objectFit:'contain', filter:'brightness(10)' }} />
      <div>
        <h2 style={{ color:'white', fontSize:'1.3rem', fontWeight:800, margin:0 }}>{saudacao} ao Projeto OBA!</h2>
        <p style={{ color:'rgba(255,255,255,0.75)', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'1.5px', marginTop:'0.2rem' }}>{sub}</p>
      </div>
    </div>
  )"""

new_hd = """  const Header = ({ sub }) => (
    <div style={HD}>
      <button onClick={onFechar} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, color:'white', fontSize:'0.8rem', fontWeight:700, padding:'0.4rem 0.8rem', cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>← Voltar</button>
      <img src={logo} alt="OBA" style={{ width:40, height:40, objectFit:'contain', filter:'brightness(10)' }} />
      <div>
        <h2 style={{ color:'white', fontSize:'1.2rem', fontWeight:800, margin:0 }}>{saudacao} ao Projeto OBA!</h2>
        <p style={{ color:'rgba(255,255,255,0.75)', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'1.5px', marginTop:'0.2rem' }}>{sub}</p>
      </div>
    </div>
  )"""

if old_hd in txt:
    txt = txt.replace(old_hd, new_hd)
    fixed.append('OK: botão Voltar no Header do OBAModal')
else:
    fixed.append('ERRO: Header OBAModal não encontrado')

with open(oba, 'w', encoding='utf-8') as f:
    f.write(txt)

# ── 2. LandingPage: clarear labels e bordas dos campos do celular ─────────────
with open(lp, encoding='utf-8') as f:
    txt = f.read()

# Labels: rgba(255,255,255,0.55) → rgba(255,255,255,0.75)
old_label = "color:'rgba(255,255,255,0.55)', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3"
new_label = "color:'rgba(255,255,255,0.75)', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3"
count = txt.count(old_label)
txt = txt.replace(old_label, new_label)
fixed.append(f'OK: labels mais claros ({count} ocorrências)')

# Bordas e bg dos inputs: 0.18 → 0.3, bg 0.07 → 0.12
old_input_border = "border:'1px solid rgba(255,255,255,0.18)'"
new_input_border = "border:'1px solid rgba(255,255,255,0.3)'"
count2 = txt.count(old_input_border)
txt = txt.replace(old_input_border, new_input_border)
fixed.append(f'OK: bordas inputs mais claras ({count2} ocorrências)')

old_input_bg = "background:'rgba(255,255,255,0.07)'"
new_input_bg = "background:'rgba(255,255,255,0.12)'"
count3 = txt.count(old_input_bg)
txt = txt.replace(old_input_bg, new_input_bg)
fixed.append(f'OK: bg inputs mais claro ({count3} ocorrências)')

# Texto dos inputs: 0.85 → 1
old_input_color = "color:'rgba(255,255,255,0.85)'"
new_input_color = "color:'white'"
count4 = txt.count(old_input_color)
txt = txt.replace(old_input_color, new_input_color)
fixed.append(f'OK: texto inputs branco ({count4} ocorrências)')

# Checkboxes contexto clínico: bg e border mais claros
old_ctx_bg = "background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.15)'"
new_ctx_bg = "background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.28)'"
count5 = txt.count(old_ctx_bg)
txt = txt.replace(old_ctx_bg, new_ctx_bg)
fixed.append(f'OK: checkboxes contexto mais claros ({count5} ocorrências)')

# Labels contexto clínico: 0.4 → 0.6
old_ctx_label = "color:'rgba(255,255,255,0.4)', fontSize:8, textTransform:'uppercase', letterSpacing:1, margin:'0 0 5px'"
new_ctx_label = "color:'rgba(255,255,255,0.65)', fontSize:8, textTransform:'uppercase', letterSpacing:1, margin:'0 0 5px'"
count6 = txt.count(old_ctx_label)
txt = txt.replace(old_ctx_label, new_ctx_label)
fixed.append(f'OK: labels contexto mais claros ({count6} ocorrências)')

with open(lp, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
