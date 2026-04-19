lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'
with open(lp, encoding='utf-8') as f:
    txt = f.read()

idx = txt.find('Sou Bariátrico')
# Pegar o botão completo — procurar o <button que contém esse texto
start = txt.rfind('<button', 0, idx)
end = txt.find('</button>', idx) + 9
print(repr(txt[start:end]))
