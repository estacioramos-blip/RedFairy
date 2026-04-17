lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# 1. Reorganizar o bloco da dupla linha — texto principal + subtexto
old_linha = """            {/* Dupla linha vermelha + texto afiliados */}
            <div style={{ margin:'0.5rem 0 0.8rem', textAlign:'center' }}>
              <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginBottom:'0.5rem' }} />
              <p style={{ color:'#1F2937', fontSize:'0.88rem', fontWeight:600, margin:'0.3rem 0 0.2rem' }}>
                Avalie um paciente e torne-se membro do Programa de Afiliados patrocinado.
              </p>
              <p style={{ color:'#6B7280', fontSize:'0.7rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', margin:'0.2rem 0 0.3rem' }}>
                VÁLIDO PARA PROFISSIONAIS DE SAÚDE COM REGISTRO EM CONSELHO
              </p>
              <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginTop:'0.3rem' }} />
            </div>"""

new_linha = """            {/* Dupla linha vermelha + texto afiliados */}
            <div style={{ margin:'0.5rem 0 0.8rem', textAlign:'center' }}>
              <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginBottom:'0.5rem' }} />
              <p style={{ color:'#1F2937', fontSize:'0.88rem', fontWeight:600, margin:'0.3rem 0 0.1rem' }}>
                Avalie um paciente e torne-se membro do Programa de Afiliados patrocinado.
              </p>
              <p style={{ color:'#6B7280', fontSize:'0.78rem', fontWeight:500, margin:'0 0 0.2rem' }}>
                Ao beneficiar pacientes, você também passa a auferir benefícios.
              </p>
              <p style={{ color:'#9CA3AF', fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', margin:'0.2rem 0 0.3rem' }}>
                VÁLIDO PARA PROFISSIONAIS DE SAÚDE COM REGISTRO EM CONSELHO
              </p>
              <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginTop:'0.3rem' }} />
            </div>"""

if old_linha in txt:
    txt = txt.replace(old_linha, new_linha)
    fixed.append('OK: subtexto adicionado na dupla linha hero')
else:
    fixed.append('ERRO: dupla linha hero não encontrada')

# 2. Remover o texto longo do trust (footer da hero)
old_trust = """              <div className="trust-i">
                <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>Ao avaliar pacientes você passa a integrar o nosso Programa de Afiliados. Ao beneficiar pacientes, você também passa a auferir benefícios.</span>
              </div>"""
new_trust = ""

if old_trust in txt:
    txt = txt.replace(old_trust, new_trust)
    fixed.append('OK: texto afiliados removido do trust')
else:
    fixed.append('ERRO: texto trust não encontrado')

with open(lp, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print('Concluído.')
