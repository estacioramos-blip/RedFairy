"""
fix_vite_sourcemap.py

Adiciona sourcemap: true ao vite.config.js para que o proximo
build preserve referencias ao codigo fonte.
"""
from pathlib import Path
import sys

VITE = Path("vite.config.js")

if not VITE.exists():
    print("ERRO: vite.config.js nao encontrado.")
    sys.exit(1)

src = VITE.read_text(encoding="utf-8")

if "sourcemap" in src:
    print("AVISO: sourcemap ja existe no config.")
    sys.exit(0)

antigo = """export default defineConfig({
  plugins: [react()],
})"""

novo = """export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
  },
})"""

if antigo in src:
    src = src.replace(antigo, novo, 1)
    VITE.write_text(src, encoding="utf-8")
    print("OK: sourcemap: true adicionado ao vite.config.js.")
else:
    print("ERRO: padrao exato nao casou. Conteudo atual:")
    print(src)
    sys.exit(1)

print()
print("Proximos passos:")
print("  1. npm run build")
print("  2. npm run preview")
print("  3. Abrir o URL que aparecer (ex: http://localhost:4173)")
print("  4. Abrir console (F12)")
print("  5. Clicar 'Avaliar Paciente' com caso M 55a Hb 13 Ferr 15")
print("  6. Ler o erro no console (agora com nomes reais)")
