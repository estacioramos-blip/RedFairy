filepath = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(filepath, encoding='utf-8') as f:
    txt = f.read()

old = """            <div className="hidden sm:flex flex-col gap-0.5" title="Atalhos de perfil demo">
              <span className="text-red-300 text-[9px] font-mono leading-tight">Ctrl+M ♂20  Ctrl+B ♂50</span>
              <span className="text-red-300 text-[9px] font-mono leading-tight">Ctrl+F ♀20  Ctrl+G ♀50</span>
            </div>"""

new = """            <div style={{ display:'flex', flexDirection:'column', gap:2 }} title="Atalhos de perfil demo">
              <span style={{ color:'#fca5a5', fontSize:'9px', fontFamily:'monospace', lineHeight:1.3 }}>Ctrl+M ♂20  Ctrl+B ♂50</span>
              <span style={{ color:'#fca5a5', fontSize:'9px', fontFamily:'monospace', lineHeight:1.3 }}>Ctrl+F ♀20  Ctrl+G ♀50</span>
            </div>"""

if old in txt:
    txt = txt.replace(old, new)
    open(filepath, 'w', encoding='utf-8').write(txt)
    print('OK: hint sempre visível com style inline')
else:
    print('ERRO: trecho nao encontrado')
