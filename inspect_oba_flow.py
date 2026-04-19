lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'
with open(lp, encoding='utf-8') as f:
    txt = f.read()

idx = txt.find('Sou Bariátrico')
if idx >= 0:
    print(repr(txt[max(0,idx-200):idx+200]))
