filepath = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(filepath, encoding='utf-8') as f:
    txt = f.read()

# 1. Melhorar animação pulse — borda vermelha mais visível
old1 = "  @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(232,114,12,0.5);}50%{box-shadow:0 0 0 10px rgba(232,114,12,0);} }"
new1 = "  @keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(220,38,38,0.8), 0 0 0 0 rgba(220,38,38,0.4);}70%{box-shadow:0 0 0 12px rgba(220,38,38,0), 0 0 0 24px rgba(220,38,38,0);}100%{box-shadow:0 0 0 0 rgba(220,38,38,0), 0 0 0 0 rgba(220,38,38,0);} }"

# 2. Centralizar botão e adicionar borda vermelha no style inline
old2 = "                <button className=\"btn btn-oba-main\" onClick={() => setShowOBA(true)} style={{ flexDirection:'column', gap:'0.2rem', alignItems:'center', animation:'pulse 1.8s ease-in-out infinite' }}>"
new2 = "                <button className=\"btn btn-oba-main\" onClick={() => setShowOBA(true)} style={{ flexDirection:'column', gap:'0.2rem', alignItems:'center', animation:'pulse 1.5s ease-out infinite', margin:'0 auto', display:'flex', border:'2px solid rgba(220,38,38,0.8)' }}>"

fixed = []
for old, new, label in [(old1, new1, 'animação pulse'), (old2, new2, 'botão centralizado + borda')]:
    if old in txt:
        txt = txt.replace(old, new)
        fixed.append(f'OK: {label}')
    else:
        fixed.append(f'ERRO: {label} nao encontrado')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(txt)

for msg in fixed:
    print(msg)
print("Arquivo salvo.")
