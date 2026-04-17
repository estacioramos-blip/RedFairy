oba = 'C:/Users/Estacio/Desktop/redfairy/src/components/OBAModal.jsx'

with open(oba, encoding='utf-8') as f:
    txt = f.read()

idx = txt.find('Status Ponderal')
print('=== Status Ponderal ===')
print(repr(txt[idx-50:idx+800]))
