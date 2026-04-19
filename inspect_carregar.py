dash = 'C:/Users/Estacio/Desktop/redfairy/src/components/PatientDashboard.jsx' 
with open(dash, encoding='utf-8') as f: 
    txt = f.read() 
idx = txt.find('async function carregarDados') 
print(repr(txt[idx:idx+600])) 
