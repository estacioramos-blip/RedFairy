auth = 'C:/Users/Estacio/Desktop/redfairy/src/components/AuthPage.jsx'

with open(auth, encoding='utf-8') as f:
    txt = f.read()

# Ver o que está no handleDemoKey atual
idx = txt.find('handleDemoKey')
print(repr(txt[idx:idx+800]))
