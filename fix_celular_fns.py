lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

# Adicionar funções após o useState do rfResultado
old_fn = "  function rfAvaliar() {"
new_fn = """  const rfMatrix2 = [
    { id:3,  label:'Eritron Saudável',           color:'#16A34A', diag:'Produção normal de hemoglobina e células vermelhas, com boa reserva de ferro.',           rec:'Avaliação médica preventiva semestral.',                                       c:{ f:{a:25,b:150},   h:{a:12,b:17.5}, v:{a:75,b:100}, r:{a:11.5,b:15.5}, s:{a:20,b:50}  } },
    { id:10, label:'Sideropenia sem Anemia',     color:'#CA8A04', diag:'Hemoglobina normal, mas com depleção incipiente de ferro.',                              rec:'Procure hematologista. Investigue a causa.',                                   c:{ f:{a:0,b:24},     h:{a:12,b:17.5}, v:{a:75,b:100}, r:{a:15.1,b:999}, s:{a:0,b:50}   } },
    { id:11, label:'Anemia Ferropriva Moderada', color:'#EA580C', diag:'Deficiência de ferro com impacto sobre a produção de hemoglobina — anemia moderada.',    rec:'Avaliação com hematologista. Reposição de ferro conforme avaliação.',          c:{ f:{a:0,b:24},     h:{a:10,b:11.9}, v:{a:0,b:79},   r:{a:15.1,b:999}, s:{a:0,b:50}   } },
    { id:12, label:'Anemia Ferropriva Importante',color:'#DC2626', diag:'Anemia ferropriva importante. Exige intervenção médica imediata.',                       rec:'Avaliação urgente. Ferro endovenoso indicado.',                               c:{ f:{a:0,b:24},     h:{a:7,b:9.9},   v:{a:0,b:79},   r:{a:15.1,b:999}, s:{a:0,b:19}   } },
    { id:5,  label:'Processo Inflamatório',      color:'#CA8A04', diag:'Ferritina elevada com saturação normal. Processos inflamatórios ou doenças crônicas.',   rec:'Procure hematologista. Investigar a ferritina elevada.',                       c:{ f:{a:151,b:400},  h:{a:12,b:17.5}, v:{a:80,b:100}, r:{a:11.5,b:16},  s:{a:20,b:50}  } },
    { id:7,  label:'Excesso de Ferro / Siderose',color:'#EA580C', diag:'Ferritina e saturação da transferrina elevadas — siderose significativa.',                rec:'Sangrias terapêuticas podem ser indicadas.',                                   c:{ f:{a:401,b:900},  h:{a:12,b:17.5}, v:{a:80,b:100}, r:{a:11.5,b:15},  s:{a:51,b:999} } },
    { id:8,  label:'Compatível com Hemocromatose',color:'#DC2626',diag:'Ferritina e saturação muito elevadas. Possível hemocromatose hereditária.',              rec:'Avaliação urgente. Sangrias indicadas.',                                       c:{ f:{a:801,b:9999}, h:{a:12,b:17.5}, v:{a:80,b:100}, r:{a:11.5,b:15},  s:{a:51,b:999} } },
  ]

  function rfAvaliar2() {
    const hb   = parseFloat(document.getElementById('rf-hb2')?.value)
    const ferr = parseFloat(document.getElementById('rf-ferr2')?.value)
    const vcm  = parseFloat(document.getElementById('rf-vcm2')?.value)
    const rdw  = parseFloat(document.getElementById('rf-rdw2')?.value)
    const sat  = parseFloat(document.getElementById('rf-sat2')?.value)
    const erro = document.getElementById('rf-erro2')
    if ([hb,ferr,vcm,rdw,sat].some(isNaN)) {
      if (erro) { erro.textContent='Preencha todos os campos laboratoriais.'; erro.style.display='block' }
      return
    }
    if (erro) erro.style.display='none'
    const iR = (v,r) => v>=r.a && v<=r.b
    const res = rfMatrix2.find(m => iR(hb,m.c.h)&&iR(ferr,m.c.f)&&iR(vcm,m.c.v)&&iR(rdw,m.c.r)&&iR(sat,m.c.s))
    const form = document.getElementById('rf-view-form')
    const result = document.getElementById('rf-view-result')
    const screen = document.getElementById('rf-screen')
    if (form) form.style.display='none'
    if (result) result.style.display='block'
    if (screen) screen.scrollTop=0
    if (res) {
      const h = document.getElementById('rf-result-header')
      if (h) h.style.background=res.color
      const l = document.getElementById('rf-result-label')
      if (l) l.textContent=res.label
      const d = document.getElementById('rf-result-diag')
      if (d) d.textContent=res.diag
      const r = document.getElementById('rf-result-rec')
      if (r) r.textContent=res.rec
    } else {
      const h = document.getElementById('rf-result-header')
      if (h) h.style.background='#6B7280'
      const l = document.getElementById('rf-result-label')
      if (l) l.textContent='Combinação não encontrada'
      const d = document.getElementById('rf-result-diag')
      if (d) d.textContent='Acesse o RedFairy completo para avaliação detalhada.'
      const r = document.getElementById('rf-result-rec')
      if (r) r.textContent=''
    }
  }

  function rfReset2() {
    const form = document.getElementById('rf-view-form')
    const result = document.getElementById('rf-view-result')
    const screen = document.getElementById('rf-screen')
    if (form) form.style.display='block'
    if (result) result.style.display='none'
    if (screen) screen.scrollTop=0
  }

  function rfAvaliar() {"""

if old_fn in txt:
    txt = txt.replace(old_fn, new_fn)
    with open(lp, 'w', encoding='utf-8') as f:
        f.write(txt)
    print('OK: funções rfAvaliar2 e rfReset2 adicionadas')
else:
    print('ERRO: âncora não encontrada')
