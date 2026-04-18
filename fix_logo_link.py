lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

old = '        <a href="#" className="nav-brand">\n          <img src={logo} alt="RedFairy" style={{ height:36 }} />\n          <span>Red<em>Fairy</em></span>\n        </a>'
new = '        <div className="nav-brand">\n          <img src={logo} alt="RedFairy" style={{ height:36 }} />\n          <span>Red<em>Fairy</em></span>\n        </div>'

if old in txt:
    txt = txt.replace(old, new)
    open(lp, 'w', encoding='utf-8').write(txt)
    print('OK: logo sem link')
else:
    print('ERRO: âncora não encontrada')
