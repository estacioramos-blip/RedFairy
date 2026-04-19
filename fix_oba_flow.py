lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    txt = f.read()

fixed = []

# Ver props da LandingPage para confirmar onModoPaciente
idx = txt.find('function LandingPage(')
if idx < 0:
    idx = txt.find('export default function LandingPage')
print('Props LandingPage:')
print(repr(txt[idx:idx+150]))
print('---')

# Ver se onModoPaciente existe
if 'onModoPaciente' in txt:
    print('onModoPaciente: JÁ EXISTE')
else:
    print('onModoPaciente: NÃO EXISTE — usar onModoMedico com flag e redirecionar')

# Corrigir o botão — salvar flag bariatrica no localStorage e chamar onModoPaciente
old_btn = "onClick={() => onModoMedico('bariatrica')}"
new_btn = """onClick={() => {
                        localStorage.setItem('rf_flag', 'bariatrica')
                        onModoPaciente && onModoPaciente()
                      }}"""

if old_btn in txt:
    txt = txt.replace(old_btn, new_btn)
    open(lp, 'w', encoding='utf-8').write(txt)
    fixed.append('OK: botão corrigido para modo paciente com flag bariatrica')
else:
    fixed.append('ERRO: onClick não encontrado')

for msg in fixed:
    print(msg)
