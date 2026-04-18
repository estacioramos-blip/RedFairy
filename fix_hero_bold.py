lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

old = "fontSize:'0.88rem', color:'var(--text-sec)', lineHeight:1.6, fontWeight:500, margin:0, textAlign:'justify'"
new = "fontSize:'0.88rem', color:'var(--text-sec)', lineHeight:1.6, fontWeight:700, margin:0, textAlign:'justify'"

count = txt.count(old)
txt = txt.replace(old, new)

with open(lp, 'w', encoding='utf-8') as f:
    f.write(txt)

print(f'OK: {count} textos em negrito')
print('Concluído.')
