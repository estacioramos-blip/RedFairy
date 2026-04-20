"""
add_subtexto_ferritina.py

Adiciona um subtexto discreto embaixo do campo Ferritina no
PatientDashboard.jsx avisando para nao usar ponto em valores >= 1000.

Ex: usuario pode digitar 1140 ao inves de 1.140 (que seria lido como 1,140).

O estilo segue o padrao dos outros subtextos do Dashboard:
text-xs text-gray-400 mt-1.
"""

from pathlib import Path
import sys

ARQ = Path("src/components/PatientDashboard.jsx")

if not ARQ.exists():
    print(f"ERRO: arquivo nao encontrado: {ARQ.resolve()}")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# Idempotencia
if "Nao use ponto" in src or "Não use ponto" in src:
    print("AVISO: subtexto ja parece existir. Pulando.")
    sys.exit(0)

# ─────────────────────────────────────────────────────────────────────
# ALTERACAO — Adicionar <p> subtexto logo depois do input de Ferritina
#
# A estrutura atual no Dashboard usa um .map de campos. Nao da pra injetar
# o subtexto dentro do map diretamente (afetaria todos). Estrategia:
# trocar o bloco inteiro do .map por uma versao que trata Ferritina
# de forma especial.
# ─────────────────────────────────────────────────────────────────────
ancora = """            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Ferritina (ng/mL)', name: 'ferritina' },
                { label: 'Hemoglobina (g/dL)', name: 'hemoglobina' },
                { label: 'VCM (fL)', name: 'vcm' },
                { label: 'RDW-CV (%)', name: 'rdw' },
                { label: 'Sat. Transferrina (%)', name: 'satTransf' },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input type="number" step="0.1" name={f.name} value={inputs[f.name]} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                </div>
              ))}
            </div>"""

novo = """            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: 'Ferritina (ng/mL)', name: 'ferritina', hint: 'Não use ponto para valores superiores a 1000. Ex: 1140' },
                { label: 'Hemoglobina (g/dL)', name: 'hemoglobina' },
                { label: 'VCM (fL)', name: 'vcm' },
                { label: 'RDW-CV (%)', name: 'rdw' },
                { label: 'Sat. Transferrina (%)', name: 'satTransf' },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <input type="number" step="0.1" name={f.name} value={inputs[f.name]} onChange={handleChange}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                  {f.hint && <p className="text-xs text-gray-400 mt-1">{f.hint}</p>}
                </div>
              ))}
            </div>"""

if ancora not in src:
    print("ERRO: ancora do grid de labs nao encontrada.")
    print("   O arquivo pode ter sido modificado. Verifique manualmente.")
    sys.exit(1)

src = src.replace(ancora, novo, 1)
print("OK: subtexto adicionado embaixo do campo Ferritina.")
print("    Texto: 'Nao use ponto para valores superiores a 1000. Ex: 1140'")

ARQ.write_text(src, encoding="utf-8")
print(f"\nArquivo salvo: {ARQ.resolve()}")
print("\nProximo passo:")
print('  git add . && git commit -m "feat: subtexto de alerta no campo Ferritina" && git push origin main')
