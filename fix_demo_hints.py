filepath = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(filepath, encoding='utf-8') as f:
    txt = f.read()

# Adicionar indicadores de atalho na barra vermelha — lado esquerdo (após botão Voltar) e lado direito (antes do Sair)
old = """          <button onClick={onVoltar}
            className="bg-red-800 hover:bg-red-900 rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors">
            Voltar
          </button>"""

new = """          <div className="flex items-center gap-2">
            <button onClick={onVoltar}
              className="bg-red-800 hover:bg-red-900 rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors">
              Voltar
            </button>
            <div className="hidden sm:flex flex-col gap-0.5" title="Atalhos de perfil demo">
              <span className="text-red-300 text-[9px] font-mono leading-tight">Ctrl+M ♂20  Ctrl+B ♂50</span>
              <span className="text-red-300 text-[9px] font-mono leading-tight">Ctrl+F ♀20  Ctrl+G ♀50</span>
            </div>
          </div>"""

if old in txt:
    txt = txt.replace(old, new)
    open(filepath, 'w', encoding='utf-8').write(txt)
    print('OK: atalhos adicionados na barra')
else:
    print('ERRO: trecho nao encontrado')
