lp = 'C:/Users/Estacio/Desktop/redfairy/src/components/LandingPage.jsx'

with open(lp, encoding='utf-8') as f:
    lines = f.readlines()

# Remover linhas 826-836 e reinserir dentro do div (antes da linha 826)
# Linha 826 (idx 825): '              </div>\n'
# Linhas 827-836: o bloco do footer

bloco_footer = [
    "                <div style={{ margin:'1.5rem 0 0' }}>\n",
    "                  <div style={{ height:1.5, background:'#7B1E1E', borderRadius:1, marginBottom:'0.8rem' }} />\n",
    "                  <p style={{ color:'#1F2937', fontSize:'0.95rem', fontWeight:600, textAlign:'center', margin:'0 0 0.2rem' }}>\n",
    "                    O Programa de Afiliados RedFairy beneficia quem beneficia os seus pacientes.\n",
    "                  </p>\n",
    "                  <p style={{ color:'#6B7280', fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', textAlign:'center', margin:'0.2rem 0 0', cursor:'pointer' }}\n",
    "                     onClick={() => document.getElementById('acesso')?.scrollIntoView({ behavior:'smooth' })}>\n",
    "                    CONHEÇA AS REGRAS\n",
    "                  </p>\n",
    "                </div>\n",
]

# Verificar linhas atuais 825-836
print('Linhas 824-838 atuais:')
for i in range(823, 838):
    print(f'  {i+1}: {repr(lines[i].rstrip())}')

# Remover bloco externo (linhas 826-836, índices 825-835)
# e inserir antes do </div> na linha 826
new_lines = lines[:824]  # até linha 824 (índice 823)
new_lines.extend(bloco_footer)  # inserir footer
new_lines.append('              </div>\n')  # fechar div
new_lines.extend(lines[836:])  # continuar do )} em diante (linha 837, índice 836)

with open(lp, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print('\nOK: footer movido para dentro do div')

# Verificar resultado
with open(lp, encoding='utf-8') as f:
    new_lines2 = f.readlines()
print('\nLinhas 823-840 após:')
for i in range(822, 840):
    print(f'  {i+1}: {repr(new_lines2[i].rstrip())}')
