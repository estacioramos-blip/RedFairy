dash = 'C:/Users/Estacio/Desktop/redfairy/src/components/PatientDashboard.jsx' 
with open(dash, encoding='utf-8') as f: 
    txt = f.read() 
old1 = "import ResultCard from './ResultCard'" 
new1 = "import ResultCard from './ResultCard'\nimport OBAModal from './OBAModal'" 
if old1 in txt: txt = txt.replace(old1, new1) 
old2 = "      {/* MODAL SOBRE */}" 
new2 = "      {showOBAModal and profile and OBAModal(cpf=profile.cpf)}\n      {/* MODAL SOBRE */}" 
open(dash, 'w', encoding='utf-8').write(txt) 
print('OK') 
