lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

# Ver estado atual dos links do nav
idx = txt.find('nav-links')
print('=== nav-links ===')
print(repr(txt[idx:idx+800]))
