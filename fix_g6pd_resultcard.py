rc_path = 'C:/Users/Estacio/Desktop/redfairy/src/components/ResultCard.jsx'
with open(rc_path, encoding='utf-8') as f:
    rc = f.read()

# Inserir bloco g6pdAlerta após fraseHipermenorreia
old = """          {resultado.fraseHipermenorreia && (
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wide mb-2 text-pink-700">⚠️ Hipermenorreia</h4>
              <p className="text-gray-700 text-sm leading-relaxed bg-pink-50 rounded-xl p-4 border border-pink-200">
                {resultado.fraseHipermenorreia}
              </p>
            </div>
          )}"""

new = old + """

          {resultado.g6pdAlerta && (
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wide mb-2 text-purple-700">⚠️ G-6-PD</h4>
              <p className="text-gray-700 text-sm leading-relaxed bg-purple-50 rounded-xl p-4 border border-purple-200">
                {resultado.g6pdAlerta}
              </p>
            </div>
          )}"""

if old in rc:
    rc = rc.replace(old, new)
    open(rc_path, 'w', encoding='utf-8').write(rc)
    print('OK: g6pdAlerta exibido no ResultCard')
else:
    print('ERRO: âncora fraseHipermenorreia não encontrada')
