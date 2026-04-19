dash = 'C:/Users/Estacio/Desktop/redfairy/src/components/PatientDashboard.jsx'
with open(dash, encoding='utf-8') as f:
    txt = f.read()

# Ver showOBAModal e OBAModal no JSX
for term in ['showOBAModal', 'OBAModal', 'setShowOBAModal']:
    idx = txt.find(term)
    while idx >= 0:
        print(f'[{term}] linha ~{txt[:idx].count(chr(10))+1}')
        print(repr(txt[max(0,idx-30):idx+100]))
        print('---')
        idx = txt.find(term, idx+1)
