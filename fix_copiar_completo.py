"""
fix_copiar_completo.py

Tres correcoes no fluxo do botao 'Copiar Resultado para WhatsApp':

  1. decisionEngine.js - formatarParaCopiar EXPANDIDO:
     - Acrescenta ACHADOS PARALELOS (se houver)
     - Acrescenta ALERTA G-6-PD (se houver)
     - Acrescenta AVALIACAO OBA (se houver, resumido)

  2. ResultCard.jsx - bottao MOVIDO para o fim absoluto,
     depois de Achados Paralelos, OBA e Painel Medico/Paciente.

  3. PatientDashboard.jsx - handleCopiar implementado de verdade
     (navigator.clipboard + feedback visual de 3 segundos).
"""

from pathlib import Path
import sys

# ═════════════════════════════════════════════════════════════════════
# 1. decisionEngine.js - expandir formatarParaCopiar
# ═════════════════════════════════════════════════════════════════════
ENGINE = Path("src/engine/decisionEngine.js")
if not ENGINE.exists():
    print(f"ERRO: {ENGINE} nao encontrado.")
    sys.exit(1)

engine_src = ENGINE.read_text(encoding="utf-8")

ancora_engine = """  if (resultado.comentarios.length > 0) {
    texto += 'MEDICAMENTOS / SUPLEMENTOS\\n';
    resultado.comentarios.forEach(c => {
      texto += '- ' + c.titulo + ': ' + c.texto + '\\n';
    });
    texto += '\\n';
  }

  texto += 'PRÓXIMOS EXAMES SUGERIDOS\\n';
  resultado.proximosExames.forEach(e => {
    texto += '- ' + e + '\\n';
  });

  texto += '\\nGerado pelo RedFairy';
  return texto;
}"""

novo_engine = """  if (resultado.comentarios.length > 0) {
    texto += 'MEDICAMENTOS / SUPLEMENTOS\\n';
    resultado.comentarios.forEach(c => {
      texto += '- ' + c.titulo + ': ' + c.texto + '\\n';
    });
    texto += '\\n';
  }

  // ACHADOS PARALELOS
  if (resultado.achadosParalelos && resultado.achadosParalelos.length > 0) {
    texto += 'OUTROS ACHADOS RELEVANTES\\n';
    resultado.achadosParalelos.forEach(a => {
      texto += '- ' + a.label + ': ' + a.texto + '\\n\\n';
    });
  }

  // ALERTA G-6-PD
  if (resultado.g6pdAlerta) {
    texto += 'ALERTA G-6-PD\\n';
    texto += resultado.g6pdAlerta + '\\n\\n';
  }

  // AVALIACAO OBA (resumida)
  if (resultado._oba) {
    const oba = resultado._oba;
    texto += 'AVALIACAO OBA (BARIATRICO)\\n';
    texto += 'Cirurgia: ' + oba.tipoCirurgia + ' | ' + oba.mesesPosCirurgia + ' meses pos-cirurgia\\n';
    texto += 'Grau de disabsorcao: ' + oba.grauDisabsorcao + '/3\\n\\n';

    if (oba.alertas && oba.alertas.length > 0) {
      texto += 'Alertas OBA:\\n';
      oba.alertas.forEach(a => {
        texto += '- [' + (a.nivel || '').toUpperCase() + '] ' + a.texto + '\\n';
      });
      texto += '\\n';
    }

    if (oba.modulos && oba.modulos.length > 0) {
      texto += 'Modulos OBA:\\n';
      oba.modulos.forEach(m => {
        if (m.nivel && m.nivel !== 'normal') {
          texto += '- ' + m.titulo + ' [' + m.nivel.toUpperCase() + ']\\n';
          if (m.linhas) {
            m.linhas.forEach(l => { texto += '  ' + l + '\\n'; });
          }
        }
      });
      texto += '\\n';
    }

    if (oba.examesComplementares && oba.examesComplementares.length > 0) {
      texto += 'Exames complementares OBA:\\n';
      oba.examesComplementares.forEach(e => {
        texto += '- ' + e + '\\n';
      });
      texto += '\\n';
    }
  }

  texto += 'PROXIMOS EXAMES SUGERIDOS\\n';
  resultado.proximosExames.forEach(e => {
    texto += '- ' + e + '\\n';
  });

  texto += '\\nGerado pelo RedFairy';
  return texto;
}"""

if ancora_engine in engine_src:
    engine_src = engine_src.replace(ancora_engine, novo_engine, 1)
    ENGINE.write_text(engine_src, encoding="utf-8")
    print("OK 1: formatarParaCopiar agora inclui Achados Paralelos + G-6-PD + OBA.")
elif "OUTROS ACHADOS RELEVANTES" in engine_src:
    print("AVISO 1: formatarParaCopiar ja expandido.")
else:
    print("ERRO 1: ancora do decisionEngine.js nao encontrada.")
    sys.exit(1)

# ═════════════════════════════════════════════════════════════════════
# 2. ResultCard.jsx - remover botao da Secao 1, adicionar no fim absoluto
# ═════════════════════════════════════════════════════════════════════
CARD = Path("src/components/ResultCard.jsx")
if not CARD.exists():
    print(f"ERRO: {CARD} nao encontrado.")
    sys.exit(1)

card_src = CARD.read_text(encoding="utf-8")

# 2a - remover o botao atual (dentro da Secao 1)
ancora_card_remove = """          <button onClick={onCopiar}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all
              ${copiado ? 'bg-green-500 text-white' : `${scheme.badge} text-white hover:opacity-90`}`}>
            {copiado ? '✅ Resultado Copiado!' : '📋 Copiar Resultado para WhatsApp'}
          </button>

        </div>
      </div>

      {/* ── SEÇÃO 1.5: ACHADOS PARALELOS ─────────────────────────────────────── */}"""

novo_card_remove = """        </div>
      </div>

      {/* ── SEÇÃO 1.5: ACHADOS PARALELOS ─────────────────────────────────────── */}"""

if ancora_card_remove in card_src:
    card_src = card_src.replace(ancora_card_remove, novo_card_remove, 1)
    print("OK 2a: botao 'Copiar' removido da Secao 1 (Diagnostico).")
elif "Copiar Resultado para WhatsApp" not in card_src[:card_src.find("SEÇÃO 1.5")]:
    print("AVISO 2a: botao ja parece ter sido removido da Secao 1.")
else:
    print("ERRO 2a: ancora do botao atual nao encontrada.")
    sys.exit(1)

# 2b - adicionar botao no fim absoluto, depois de PainelMedico/DocumentoMedicoPanel
# O fim do return do componente principal eh um </> antes de um ); final
ancora_card_add = """      ) : (
        // MODO PACIENTE — oferta de documentos
        <DocumentoMedicoPanel resultado={resultado} />
      )}
    </>
  );
}"""

novo_card_add = """      ) : (
        // MODO PACIENTE — oferta de documentos
        <DocumentoMedicoPanel resultado={resultado} />
      )}

      {/* ── BOTÃO FINAL: COPIAR RESULTADO COMPLETO PARA WHATSAPP ─────────────── */}
      <button onClick={onCopiar}
        className={`mt-6 w-full py-3 rounded-xl font-bold text-sm transition-all
          ${copiado ? 'bg-green-500 text-white' : `${scheme.badge} text-white hover:opacity-90`}`}>
        {copiado ? '✅ Resultado Copiado!' : '📋 Copiar Resultado Completo para WhatsApp'}
      </button>
    </>
  );
}"""

if ancora_card_add in card_src:
    card_src = card_src.replace(ancora_card_add, novo_card_add, 1)
    print("OK 2b: botao 'Copiar' adicionado no FIM ABSOLUTO (depois de tudo).")
elif "BOTÃO FINAL: COPIAR" in card_src:
    print("AVISO 2b: botao final ja existe.")
else:
    print("ERRO 2b: ancora do fim do ResultCard nao encontrada.")
    sys.exit(1)

CARD.write_text(card_src, encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# 3. PatientDashboard.jsx - implementar handleCopiar real
# ═════════════════════════════════════════════════════════════════════
DASH = Path("src/components/PatientDashboard.jsx")
if not DASH.exists():
    print(f"ERRO: {DASH} nao encontrado.")
    sys.exit(1)

dash_src = DASH.read_text(encoding="utf-8")

# 3a - adicionar import de formatarParaCopiar
ancora_imp = "import { avaliarPaciente } from '../engine/decisionEngine'"
novo_imp   = "import { avaliarPaciente, formatarParaCopiar } from '../engine/decisionEngine'"

if ancora_imp in dash_src and "formatarParaCopiar" not in dash_src.split("'../engine/decisionEngine'")[0]:
    dash_src = dash_src.replace(ancora_imp, novo_imp, 1)
    print("OK 3a: import de formatarParaCopiar adicionado no Dashboard.")
elif "avaliarPaciente, formatarParaCopiar" in dash_src:
    print("AVISO 3a: import ja atualizado.")
else:
    print("ERRO 3a: ancora do import nao encontrada.")
    sys.exit(1)

# 3b - substituir onCopiar={() => {}} por handler real
ancora_handler = "<ResultCard resultado={resultado} onCopiar={() => {}} copiado={copiado} />"

novo_handler = """<ResultCard resultado={resultado} onCopiar={() => {
              const texto = formatarParaCopiar(resultado, resultado._inputs || inputs)
              navigator.clipboard.writeText(texto).then(() => {
                setCopiado(true)
                setTimeout(() => setCopiado(false), 3000)
              }).catch(err => {
                console.error('Erro ao copiar:', err)
                alert('Erro ao copiar. Tente novamente.')
              })
            }} copiado={copiado} />"""

if ancora_handler in dash_src:
    dash_src = dash_src.replace(ancora_handler, novo_handler, 1)
    print("OK 3b: handleCopiar implementado no PatientDashboard.")
elif "navigator.clipboard.writeText" in dash_src:
    print("AVISO 3b: handleCopiar ja implementado.")
else:
    print("ERRO 3b: ancora de onCopiar={() => {}} nao encontrada.")
    sys.exit(1)

DASH.write_text(dash_src, encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("TUDO OK! Arquivos modificados:")
print("  1. decisionEngine.js  - formatarParaCopiar expandido")
print("  2. ResultCard.jsx     - botao movido p/ fim absoluto")
print("  3. PatientDashboard   - handleCopiar implementado")
print()
print("Texto copiado agora inclui:")
print("  - Cabecalho (paciente, sexo, idade)")
print("  - Exames + frase data")
print("  - Diagnostico")
print("  - Recomendacao")
print("  - Hipermenorreia (se aplicavel)")
print("  - Medicamentos/Suplementos")
print("  - OUTROS ACHADOS RELEVANTES (novo!)")
print("  - ALERTA G-6-PD (se houver)")
print("  - AVALIACAO OBA completa (se bariatrico)")
print("  - Proximos exames")
print()
print("Proximo passo:")
print('  git add . && git commit -m "feat: botao Copiar no fim + texto copiado completo" && git push origin main')
