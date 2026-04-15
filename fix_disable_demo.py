filepath = 'C:/Users/Estacio/Desktop/redfairy/src/components/Calculator.jsx'

with open(filepath, encoding='utf-8') as f:
    txt = f.read()

# Desativar o handleLogoTripleClick — substituir por função vazia
old = """  function handleLogoTripleClick() {
    setLogoClicks(prev => {
      const next = prev + 1;
      if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
      if (next >= 5) {
        logoClickTimer.current = null;
        setShowAdminConfig(true);
        return 0;
      }
      if (next === 3) {
        logoClickTimer.current = setTimeout(() => {
          setLogoClicks(c => { if (c === 3) setShowDemoMenu(true); return 0; });
        }, 600);
      } else {
        logoClickTimer.current = setTimeout(() => setLogoClicks(0), 1500);
      }
      return next;
    });
  }"""

new = """  function handleLogoTripleClick() {
    // Demo por cliques na fada desativado — use Ctrl+M/N/F/G
    setLogoClicks(prev => {
      const next = prev + 1;
      if (logoClickTimer.current) clearTimeout(logoClickTimer.current);
      if (next >= 5) {
        logoClickTimer.current = null;
        setShowAdminConfig(true);
        return 0;
      }
      logoClickTimer.current = setTimeout(() => setLogoClicks(0), 1500);
      return next;
    });
  }"""

if old in txt:
    txt = txt.replace(old, new)
    open(filepath, 'w', encoding='utf-8').write(txt)
    print('OK: demo por cliques na fada desativado')
else:
    print('ERRO: trecho nao encontrado')
