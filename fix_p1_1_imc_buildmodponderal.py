"""
fix_p1_1_imc_buildmodponderal.py

Bug P1.1 (detectado na revisao critica do OBAModal):

A funcao 'buildModPonderal(dados, alertas)' recebe 'dados' como
parametro, mas o bloco de IMC pre/pos-cirurgico (que adicionamos na
sessao anterior) usa 'dadosOBA.imc_antes' e 'dadosOBA.imc_atual'.

Como 'dadosOBA' nao existe no escopo local, JS retorna undefined e
'parseFloat(undefined)' da NaN. Resultado: o bloco executa mas tanto
imcAntes quanto imcAtual sao sempre NaN, de modo que:
  - O texto 'IMC PREVIO: desconhecido · IMC ATUAL: desconhecido' sempre aparece
  - A analise de reducao/ganho de IMC nunca roda
  - Os alertas nunca sao gerados

Fix trivial: dadosOBA -> dados (2 trocas).
"""

from pathlib import Path
import sys

ARQ = Path("src/engine/obaEngine.js")
if not ARQ.exists():
    print(f"ERRO: {ARQ} nao existe.")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# Trocar 'dadosOBA.imc_antes' por 'dados.imc_antes'
# ═════════════════════════════════════════════════════════════════════
trocas = [
    ("parseFloat(dadosOBA.imc_antes)", "parseFloat(dados.imc_antes)"),
    ("parseFloat(dadosOBA.imc_atual)", "parseFloat(dados.imc_atual)"),
]

total_trocas = 0
for antigo, novo in trocas:
    count = src.count(antigo)
    if count > 0:
        src = src.replace(antigo, novo)
        total_trocas += count
        print(f"OK: '{antigo}' -> '{novo}' ({count}x)")
    else:
        print(f"AVISO: '{antigo}' nao encontrado (ja foi corrigido?).")

# Sanidade: checar se ainda existe 'dadosOBA' no arquivo (em qualquer contexto)
ainda_existe = src.count("dadosOBA")
if ainda_existe > 0:
    print(f"\n  ATENCAO: ainda ha {ainda_existe} ocorrencia(s) de 'dadosOBA' no arquivo.")
    print("  Se nao for o parametro formal em alguma funcao, verificar manualmente:")
    linhas = src.splitlines()
    for i, l in enumerate(linhas):
        if "dadosOBA" in l:
            print(f"    linha {i+1}: {l.strip()[:200]}")

if total_trocas > 0:
    ARQ.write_text(src, encoding="utf-8")
    print(f"\n  {total_trocas} troca(s) salvas em {ARQ}")

# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
print("FIX P1.1 APLICADO!")
print("=" * 60)
print()
print("EFEITO ESPERADO:")
print("  - IMC PREVIO agora mostra valor real (ou 'desconhecido' se nao informado)")
print("  - IMC ATUAL agora mostra valor real")
print("  - Bloco de reducao/ganho de IMC executa corretamente")
print("  - Alertas de reganho expressivo / perda insuficiente geram quando devido")
print()
print("TESTE:")
print("  Entrar no OBAModal > modulo Ponderal")
print("  Preencher IMC antes (ex: 42) e IMC atual (ex: 28)")
print("  Esperar texto: 'REDUCAO DE IMC: 14 unidades (33.3% do IMC inicial)'")
print("                 'PERDA DE IMC ADEQUADA/EXCELENTE ...'")
print()
print("Proximo passo:")
print('  git add . && git commit -m "fix P1.1: dadosOBA -> dados em buildModPonderal" && git push origin main')
