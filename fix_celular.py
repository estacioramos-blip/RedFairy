lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

# Encontrar início e fim da seção avaliar
start = txt.find("      {/* EXPERIMENTE AGORA */}")
end = txt.find("      {/* PROJETO OBA */}")

if start == -1 or end == -1:
    print(f'ERRO: start={start}, end={end}')
else:
    old_section = txt[start:end]
    print(f'OK: seção encontrada ({len(old_section)} chars)')

    new_section = """      {/* EXPERIMENTE AGORA */}
      <section id="avaliar" style={{ background:'white', padding:'5.5rem 2rem' }}>
        <div className="container">
          <div className="center reveal" style={{ marginBottom:'2.5rem' }}>
            <span className="tag">Experimente Agora</span>
            <h2 className="stitle">Faça uma avaliação gratuita</h2>
            <p className="sdesc" style={{ margin:'0 auto' }}>Sem cadastro. Insira os dados e veja o diagnóstico.</p>
          </div>

          {/* Mockup celular */}
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
            <div style={{ width:300, background:'#1A1A2E', borderRadius:40, border:'8px solid #2A2A3E', boxShadow:'0 0 0 2px #111, inset 0 0 0 1px rgba(255,255,255,0.05)', overflow:'hidden' }}>

              {/* Notch */}
              <div style={{ background:'#111', height:26, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ width:60, height:13, background:'#1A1A2E', borderRadius:'0 0 10px 10px' }} />
              </div>
              {/* Status bar */}
              <div style={{ background:'#0F0F1A', padding:'3px 16px', display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'rgba(255,255,255,0.4)', fontSize:9 }}>9:41</span>
                <span style={{ color:'rgba(255,255,255,0.4)', fontSize:9 }}>▮▮▮ 🔋</span>
              </div>
              {/* Header com logo */}
              <div style={{ background:'linear-gradient(135deg,#7B1E1E,#DC2626)', padding:'8px 14px', display:'flex', alignItems:'center', gap:8 }}>
                <img src={logo} alt="RedFairy" style={{ height:24, objectFit:'contain', filter:'brightness(0) invert(1)' }} />
                <p style={{ color:'rgba(255,255,255,0.65)', fontSize:8, margin:0, letterSpacing:'0.5px' }}>Eritron e Metabolismo do Ferro</p>
              </div>

              {/* Tela */}
              <div id="rf-screen" style={{ background:'#0F0F1A', height:500, overflowY:'auto' }}>

                {/* Formulário */}
                <div id="rf-view-form" style={{ padding:11 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
                    <div>
                      <label style={{ color:'rgba(255,255,255,0.55)', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3 }}>Sexo</label>
                      <select id="rf-sexo" style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:6, padding:'5px 6px', color:'rgba(255,255,255,0.85)', fontSize:11, outline:'none' }}>
                        <option value="F">Feminino</option><option value="M">Masculino</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ color:'rgba(255,255,255,0.55)', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3 }}>Idade</label>
                      <input type="number" id="rf-idade" placeholder="35" style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:6, padding:'5px 6px', color:'rgba(255,255,255,0.85)', fontSize:11, outline:'none', boxSizing:'border-box' }} />
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
                    <div>
                      <label style={{ color:'rgba(255,255,255,0.55)', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3 }}>Hb (g/dL)</label>
                      <input type="number" id="rf-hb2" step="0.1" placeholder="12.5" style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:6, padding:'5px 6px', color:'rgba(255,255,255,0.85)', fontSize:11, outline:'none', boxSizing:'border-box' }} />
                    </div>
                    <div>
                      <label style={{ color:'rgba(255,255,255,0.55)', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3 }}>Ferritina (ng/mL)</label>
                      <input type="number" id="rf-ferr2" step="0.1" placeholder="15" style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:6, padding:'5px 6px', color:'rgba(255,255,255,0.85)', fontSize:11, outline:'none', boxSizing:'border-box' }} />
                    </div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
                    <div>
                      <label style={{ color:'rgba(255,255,255,0.55)', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3 }}>VCM (fL)</label>
                      <input type="number" id="rf-vcm2" step="0.1" placeholder="82" style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:6, padding:'5px 6px', color:'rgba(255,255,255,0.85)', fontSize:11, outline:'none', boxSizing:'border-box' }} />
                    </div>
                    <div>
                      <label style={{ color:'rgba(255,255,255,0.55)', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3 }}>RDW (%)</label>
                      <input type="number" id="rf-rdw2" step="0.1" placeholder="13.5" style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:6, padding:'5px 6px', color:'rgba(255,255,255,0.85)', fontSize:11, outline:'none', boxSizing:'border-box' }} />
                    </div>
                  </div>
                  <div style={{ marginBottom:10 }}>
                    <label style={{ color:'rgba(255,255,255,0.55)', fontSize:8, textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:3 }}>Sat. Transferrina (%)</label>
                    <input type="number" id="rf-sat2" step="0.1" placeholder="25" style={{ width:'100%', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:6, padding:'5px 6px', color:'rgba(255,255,255,0.85)', fontSize:11, outline:'none', boxSizing:'border-box' }} />
                  </div>

                  {/* Contexto Clínico */}
                  <div style={{ marginBottom:10 }}>
                    <p style={{ color:'rgba(255,255,255,0.4)', fontSize:8, textTransform:'uppercase', letterSpacing:1, margin:'0 0 5px' }}>Contexto Clínico</p>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginBottom:6 }}>
                      {[['bariatrica','Bariátrica'],['vegetariano','Vegetariano'],['perda','Hemorragia'],['alcoolista','Alcoolista'],['transfundido','Transfundido'],['hemoAlta','Hb Alta']].map(([k,l]) => (
                        <label key={k} style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, padding:'5px 6px', cursor:'pointer', fontSize:9, color:'rgba(255,255,255,0.7)' }}>
                          <input type="checkbox" id={`rf2-${k}`} style={{ width:10, height:10, accentColor:'#DC2626', flexShrink:0 }} /> {l}
                        </label>
                      ))}
                    </div>
                    <p style={{ color:'rgba(255,255,255,0.4)', fontSize:8, textTransform:'uppercase', letterSpacing:1, margin:'0 0 5px' }}>Medicamentos</p>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
                      {[['aspirina','Aspirina'],['b12','Vitamina B12'],['ferroMed','Ferro Oral/EV']].map(([k,l]) => (
                        <label key={k} style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, padding:'5px 6px', cursor:'pointer', fontSize:9, color:'rgba(255,255,255,0.7)' }}>
                          <input type="checkbox" id={`rf2-${k}`} style={{ width:10, height:10, accentColor:'#DC2626', flexShrink:0 }} /> {l}
                        </label>
                      ))}
                    </div>
                  </div>

                  <p id="rf-erro2" style={{ color:'#F87171', fontSize:10, margin:'0 0 6px', display:'none' }} />
                  <button onClick={() => rfAvaliar2()} style={{ width:'100%', background:'#7B1E1E', color:'white', border:'none', borderRadius:9, padding:10, fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    🔬 Avaliar Eritron
                  </button>
                  <p style={{ color:'rgba(255,255,255,0.2)', fontSize:8, textAlign:'center', margin:'8px 0 0', letterSpacing:'0.3px' }}>
                    RedFairy · Cuidar do Seu Eritron · by cytomica.com © 2026
                  </p>
                </div>

                {/* Resultado */}
                <div id="rf-view-result" style={{ display:'none', padding:11 }}>
                  <div id="rf-result-header" style={{ borderRadius:'10px 10px 0 0', padding:'10px 12px' }}>
                    <p style={{ fontSize:8, color:'rgba(255,255,255,0.6)', margin:'0 0 2px', textTransform:'uppercase', letterSpacing:1 }}>Diagnóstico</p>
                    <p id="rf-result-label" style={{ fontSize:13, fontWeight:700, color:'white', margin:0 }} />
                  </div>
                  <div style={{ background:'rgba(0,0,0,0.3)', borderRadius:'0 0 10px 10px', padding:'10px 12px', marginBottom:8 }}>
                    <p style={{ fontSize:8, color:'rgba(255,255,255,0.45)', margin:'0 0 3px', textTransform:'uppercase', letterSpacing:1 }}>Diagnóstico</p>
                    <p id="rf-result-diag" style={{ fontSize:10, color:'rgba(255,255,255,0.85)', margin:'0 0 10px', lineHeight:1.6 }} />
                    <p style={{ fontSize:8, color:'rgba(255,255,255,0.45)', margin:'0 0 3px', textTransform:'uppercase', letterSpacing:1 }}>Recomendação</p>
                    <p id="rf-result-rec" style={{ fontSize:10, color:'rgba(255,255,255,0.85)', margin:0, lineHeight:1.6 }} />
                  </div>
                  <div style={{ background:'rgba(220,38,38,0.15)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:10, padding:'10px 12px', textAlign:'center', marginBottom:8 }}>
                    <p style={{ color:'rgba(255,255,255,0.55)', fontSize:9, margin:'0 0 6px' }}>Para orientações completas com dosagens:</p>
                    <button onClick={onModoMedico} style={{ background:'#7B1E1E', color:'white', border:'none', borderRadius:7, padding:'7px 12px', fontSize:10, cursor:'pointer', fontFamily:'inherit' }}>
                      Acessar RedFairy completo →
                    </button>
                  </div>
                  <button onClick={() => rfReset2()} style={{ width:'100%', background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.6)', border:'none', borderRadius:8, padding:8, fontSize:10, cursor:'pointer', fontFamily:'inherit' }}>
                    ← Nova avaliação
                  </button>
                </div>
              </div>

              {/* Home bar */}
              <div style={{ background:'#0F0F1A', padding:7, display:'flex', justifyContent:'center' }}>
                <div style={{ width:70, height:3, background:'rgba(255,255,255,0.2)', borderRadius:2 }} />
              </div>
            </div>
          </div>
        </div>
      </section>

"""

    txt = txt[:start] + new_section + txt[end:]

    with open(lp, 'w', encoding='utf-8') as f:
        f.write(txt)
    print('OK: seção substituída')
