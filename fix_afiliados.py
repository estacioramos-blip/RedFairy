import os

files = {
    'src/components/Calculator.jsx': [
        (
            """            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-green-700 text-xs font-bold mb-1">⚡ Conta KlipBit</p>
              <p className="text-green-700 text-xs leading-relaxed">
                Usaremos seu e-mail e senha para criar sua wallet — onde você receberá 10 USDC por cada paciente cadastrado.
              </p>
            </div>""",
            """            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-green-700 text-xs font-bold mb-1">⚡ Programa de Afiliados</p>
              <p className="text-green-700 text-xs leading-relaxed">
                Ao avaliar pacientes você passa a integrar o nosso Programa de Afiliados, com suporte dos nossos patrocinadores. Ao beneficiar pacientes, você também passa a auferir benefícios.
              </p>
            </div>"""
        ),
        (
            '<p className="text-xs text-gray-400 mt-0.5">Será sua senha de login e da wallet KlipBit.</p>',
            '<p className="text-xs text-gray-400 mt-0.5">Será sua senha de acesso ao RedFairy.</p>'
        ),
    ],
    'src/components/LandingPage.jsx': [
        (
            'Doutor* ganhe DEZ DÓLARES DIGITAIS por paciente avaliado!',
            'Doutor* — Profissional de Saúde'
        ),
        (
            'CONHEÇA AS REGRAS',
            'PROGRAMA DE AFILIADOS — CONHEÇA AS REGRAS E CONDIÇÕES'
        ),
        (
            'Profissional de Saúde ganha 10 USDC por paciente avaliado e que se cadastra.',
            'Ao avaliar pacientes você passa a integrar o nosso Programa de Afiliados. Ao beneficiar pacientes, você também passa a auferir benefícios.'
        ),
    ],
}

base = 'C:/Users/Estacio/Desktop/redfairy'

for filepath, replacements in files.items():
    full = os.path.join(base, filepath)
    try:
        with open(full, encoding='utf-8') as f:
            txt = f.read()
        changed = False
        for old, new in replacements:
            if old in txt:
                txt = txt.replace(old, new)
                print(f'OK: {filepath} — {old[:50].strip()}...')
                changed = True
            else:
                print(f'NAO ENCONTRADO: {filepath} — {old[:50].strip()}...')
        if changed:
            with open(full, 'w', encoding='utf-8') as f:
                f.write(txt)
    except FileNotFoundError:
        print(f'ARQUIVO NAO ENCONTRADO: {full}')

print('Concluído.')
