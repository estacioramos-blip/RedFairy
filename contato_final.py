"""
contato_final.py

Substitui os placeholders do modal Contato pelos dados reais:
  - Laíse Silva Dantas (COO) — sem cabeçalho 'Equipe'
  - Endereço para Correspondência: Rua Barro Vermelho, 386/42 — Rio Vermelho
  - CYTOMICA® + CNPJ 57.561.446/0001-02 (rodapé institucional)
  - Bloco 'Telefones' removido (WhatsApp já está no botão verde)
"""

from pathlib import Path
import sys

ARQ = Path("src/components/LandingPage.jsx")

if not ARQ.exists():
    print(f"ERRO: arquivo nao encontrado: {ARQ.resolve()}")
    sys.exit(1)

src = ARQ.read_text(encoding="utf-8")

# Idempotencia
if "Laíse Silva Dantas" in src:
    print("Dados reais ja presentes. Nada a fazer.")
    sys.exit(0)

# Ancora exata extraida do diagnostico
ancora = '''            {/* ===================================================================== */}
            {/* CONTEÚDO DO MODAL CONTATO — Dr. Ramos, edite aqui os dados reais.     */}
            {/* ===================================================================== */}

            {/* Pessoas */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-light)', fontWeight: 700, marginBottom: '0.8rem' }}>
                Equipe
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.7, fontWeight: 600, margin: 0 }}>
                <strong>E.F. Ramos, M.D.</strong> — CRM 6302 BA<br/>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-sec)', fontWeight: 500 }}>[Placeholder] Outros membros da equipe</span>
              </p>
            </div>

            {/* Endereço */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-light)', fontWeight: 700, marginBottom: '0.8rem' }}>
                Endereço
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.7, fontWeight: 500, margin: 0 }}>
                [Placeholder] Rua, número, bairro<br/>
                Salvador — BA · CEP XXXXX-XXX
              </p>
            </div>

            {/* Telefones */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-light)', fontWeight: 700, marginBottom: '0.8rem' }}>
                Telefones
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.7, fontWeight: 500, margin: 0 }}>
                <strong style={{ color: 'var(--wine)' }}>+55 71 99711-0804</strong> — Plataforma<br/>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-sec)' }}>[Placeholder] Outros telefones, email, etc.</span>
              </p>
            </div>

            {/* ===================================================================== */}'''

novo = '''            {/* ===================================================================== */}
            {/* CONTEÚDO DO MODAL CONTATO */}
            {/* ===================================================================== */}

            {/* Contato direto (sem cabecalho Equipe, ja que e 1 pessoa) */}
            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <p style={{ fontSize: '1.05rem', color: 'var(--text)', lineHeight: 1.6, fontWeight: 700, margin: 0 }}>
                <strong style={{ color: 'var(--wine)' }}>Laíse Silva Dantas</strong>
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-sec)', fontWeight: 500, margin: '0.2rem 0 0', letterSpacing: '1px', textTransform: 'uppercase' }}>
                COO
              </p>
            </div>

            {/* Endereco */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-light)', fontWeight: 700, marginBottom: '0.8rem' }}>
                Endereço para Correspondência
              </h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.7, fontWeight: 500, margin: 0 }}>
                Rua Barro Vermelho, 386/42<br/>
                Rio Vermelho · CEP 41940-340<br/>
                Salvador — Bahia | Brasil
              </p>
            </div>

            {/* Empresa (rodape institucional) */}
            <div style={{ marginBottom: '1.5rem', paddingTop: '0.8rem', borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.7, fontWeight: 500, margin: 0, textAlign: 'center' }}>
                <strong style={{ color: 'var(--wine)', fontWeight: 700, letterSpacing: '0.5px' }}>CYTOMICA<sup style={{ fontSize: '0.6em', fontWeight: 500 }}>®</sup></strong><br/>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-sec)' }}>CNPJ 57.561.446/0001-02</span>
              </p>
            </div>

            {/* ===================================================================== */}'''

if ancora not in src:
    print("ERRO: ancora nao encontrada. Arquivo pode ter mudado.")
    sys.exit(1)

src_novo = src.replace(ancora, novo, 1)
ARQ.write_text(src_novo, encoding="utf-8")

print("OK: modal Contato atualizado.")
print("  - Laise Silva Dantas (COO)")
print("  - Rua Barro Vermelho, 386/42 - Rio Vermelho")
print("  - CYTOMICA + CNPJ 57.561.446/0001-02")
print(f"\nArquivo salvo: {ARQ.resolve()}")
print("\nProximo passo:")
print('  git add . && git commit -m "feat: dados oficiais Contato" && git push origin main')
