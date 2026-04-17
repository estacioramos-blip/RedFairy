calc = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'
app  = 'C:/Users/Estacio/Desktop/redfairy/src/App.jsx'

with open(calc, encoding='utf-8') as f:
    txt = f.read()

# Ver como Calculator recebe e usa preFlag
idx1 = txt.find('preFlag')
print('=== preFlag no Calculator ===')
for i in range(8):
    idx = txt.find('preFlag', idx1+1 if i > 0 else 0)
    if idx < 0: break
    print(f'  pos {idx}: {repr(txt[idx-30:idx+60])}')
    idx1 = idx

with open(app, encoding='utf-8') as f:
    app_txt = f.read()

idx2 = app_txt.find('onModoMedico')
print('\n=== onModoMedico no App ===')
while idx2 >= 0:
    print(f'  pos {idx2}: {repr(app_txt[idx2-10:idx2+80])}')
    idx2 = app_txt.find('onModoMedico', idx2+1)
