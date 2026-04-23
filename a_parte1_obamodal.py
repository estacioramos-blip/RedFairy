"""
a_parte1_obamodal.py

Grupo A parte 1 — Modificacoes no OBAModal.jsx + buildModAcompanhamento.

Itens implementados nesta sessao:
  1. Numero de gestacoes previas (input numerico, so aparece se sexo=F)
  2. Abortamentos espontaneos (radio SIM/NAO, so aparece se gestacoes > 0)
  5. Indicacao da cirurgia (5 radios: OBESIDADE/METABOLICA/OBESIDADE+DIABETES/HEMOCROMATOSE/GASTRECTOMIA)
  8a. Fibromialgia: adicionar EM USO DE GABAPENTINA e EM USO DE PREGABALINA
  8b. Compulsoes: adicionar CIGARRO/TABACO e CANNABIS
  9. Especialistas G3: PNEUMOLOGISTA, NEFROLOGISTA, UROLOGISTA, DERMATOLOGISTA
     + atualizar buildModAcompanhamento para reconhecer G3

Itens deixados para proximas sessoes:
  3. Data nascimento Modo Paciente (sessao 3)
  4. CEP no cadastro (sessao 3)
  6. Status Endoscopico (sessao 2)
  7. 7 novos exames (sessao 2)
  10. Status Neurologico (sessao 2)
"""

from pathlib import Path
import sys

problemas = []

OBA = Path("src/components/OBAModal.jsx")
ENG = Path("src/engine/obaEngine.js")
if not OBA.exists() or not ENG.exists():
    print("ERRO: arquivos fonte nao existem."); sys.exit(1)

oba_src = OBA.read_text(encoding="utf-8")
eng_src = ENG.read_text(encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# 1. State do form: adicionar 3 novos campos
# ═════════════════════════════════════════════════════════════════════
# ancora segura: linha que contem 'status_fibromialgia: [],'
ancora_state = "    status_intestinal: '', status_fibromialgia: [],"
novo_state   = """    status_intestinal: '', status_fibromialgia: [],
    gestacoes_previas: '', abortamentos_espontaneos: null,
    indicacao_cirurgia: '',"""

if "gestacoes_previas:" in oba_src:
    print("AVISO 1: state ja contem novos campos.")
elif ancora_state in oba_src:
    oba_src = oba_src.replace(ancora_state, novo_state, 1)
    print("OK 1: state atualizado com gestacoes_previas, abortamentos_espontaneos, indicacao_cirurgia.")
else:
    problemas.append("1: ancora do state nao encontrada")
    print("ERRO 1: ancora do state nao encontrada")

# ═════════════════════════════════════════════════════════════════════
# 2. Array ESPECIALISTAS: adicionar 4 novos (G3)
# ═════════════════════════════════════════════════════════════════════
# Vamos localizar a const ESPECIALISTAS (provavelmente perto do topo)
# Buscar por 'const ESPECIALISTAS' ou 'ESPECIALISTAS = ['
import re
# Padrao: const ESPECIALISTAS = [...]
m = re.search(r"const ESPECIALISTAS\s*=\s*\[(.*?)\]", oba_src, re.DOTALL)
if m:
    conteudo_atual = m.group(1)
    if "PNEUMOLOGISTA" in conteudo_atual:
        print("AVISO 2: novos especialistas G3 ja existem.")
    else:
        # Adicionar os 4 novos no final da lista (antes do ])
        novos = "'PNEUMOLOGISTA','NEFROLOGISTA','UROLOGISTA','DERMATOLOGISTA',"
        # Encontrar a posicao ANTES do ] e inserir
        ini, fim = m.span(1)
        conteudo_novo = conteudo_atual.rstrip().rstrip(',') + f",\n  {novos}\n"
        oba_src = oba_src[:ini] + conteudo_novo + oba_src[fim:]
        print("OK 2: 4 especialistas G3 adicionados ao array ESPECIALISTAS.")
else:
    problemas.append("2: array ESPECIALISTAS nao encontrado")
    print("ERRO 2: const ESPECIALISTAS nao encontrada")

# ═════════════════════════════════════════════════════════════════════
# 3. Array COMPULSOES: adicionar CIGARRO/TABACO e CANNABIS
# ═════════════════════════════════════════════════════════════════════
m = re.search(r"const COMPULSOES\s*=\s*\[(.*?)\]", oba_src, re.DOTALL)
if m:
    conteudo = m.group(1)
    if "CIGARRO" in conteudo or "TABACO" in conteudo:
        print("AVISO 3: compulsoes de tabaco/cannabis ja existem.")
    else:
        novos = "'CIGARRO / TABACO','CANNABIS',"
        ini, fim = m.span(1)
        conteudo_novo = conteudo.rstrip().rstrip(',') + f",\n  {novos}\n"
        oba_src = oba_src[:ini] + conteudo_novo + oba_src[fim:]
        print("OK 3: compulsoes CIGARRO/TABACO e CANNABIS adicionadas.")
else:
    problemas.append("3: array COMPULSOES nao encontrado")
    print("ERRO 3: const COMPULSOES nao encontrada")

# ═════════════════════════════════════════════════════════════════════
# 4. Fibromialgia - lista de sintomas: adicionar gabapentina/pregabalina
# ═════════════════════════════════════════════════════════════════════
# Preciso ver como ta estruturada. Pode ser FIBROMIALGIA_SINTOMAS ou similar
# Vou tentar varios nomes
nomes_candidatos_fibro = ["FIBROMIALGIA_SINTOMAS", "FIBRO_SINTOMAS", "SINTOMAS_FIBRO", "FIBROMIALGIA_OPCOES", "OPCOES_FIBRO"]
encontrou_fibro = False
for nome in nomes_candidatos_fibro:
    m = re.search(rf"const {nome}\s*=\s*\[(.*?)\]", oba_src, re.DOTALL)
    if m:
        conteudo = m.group(1)
        if "GABAPENTINA" in conteudo.upper():
            print(f"AVISO 4: gabapentina/pregabalina ja existem em {nome}.")
        else:
            novos = "'EM USO DE GABAPENTINA','EM USO DE PREGABALINA',"
            ini, fim = m.span(1)
            conteudo_novo = conteudo.rstrip().rstrip(',') + f",\n  {novos}\n"
            oba_src = oba_src[:ini] + conteudo_novo + oba_src[fim:]
            print(f"OK 4: gabapentina/pregabalina adicionadas em {nome}.")
        encontrou_fibro = True
        break

if not encontrou_fibro:
    # Talvez seja uma variavel com outro nome — vamos procurar onde aparece 'FUI DIAGNOSTICADO COM FIBROMIALGIA'
    # (encontrado no engine - linha 1459)
    idx = oba_src.find("FUI DIAGNOSTICADO COM FIBROMIALGIA")
    if idx >= 0:
        # Achar a const que contem esse texto
        # Vamos voltar no codigo e achar o 'const XXX = ['
        print("\n  Texto 'FUI DIAGNOSTICADO COM FIBROMIALGIA' encontrado. Procurando const...")
        # Buscar 50 caracteres antes do inicio da linha
        linha_inicio = oba_src.rfind("const ", 0, idx)
        if linha_inicio >= 0:
            nome_match = re.search(r"const (\w+)\s*=", oba_src[linha_inicio:linha_inicio+100])
            if nome_match:
                nome_real = nome_match.group(1)
                print(f"  Nome encontrado: {nome_real}")
                # Agora adicionar
                m2 = re.search(rf"const {nome_real}\s*=\s*\[(.*?)\]", oba_src, re.DOTALL)
                if m2:
                    conteudo = m2.group(1)
                    if "GABAPENTINA" in conteudo.upper():
                        print(f"AVISO 4: gabapentina ja existe em {nome_real}.")
                    else:
                        novos = "'EM USO DE GABAPENTINA','EM USO DE PREGABALINA',"
                        ini, fim = m2.span(1)
                        conteudo_novo = conteudo.rstrip().rstrip(',') + f",\n  {novos}\n"
                        oba_src = oba_src[:ini] + conteudo_novo + oba_src[fim:]
                        print(f"OK 4: gabapentina/pregabalina adicionadas em {nome_real}.")
                    encontrou_fibro = True

if not encontrou_fibro:
    problemas.append("4: lista de sintomas de fibromialgia nao encontrada")
    print("ERRO 4: lista de sintomas de fibromialgia nao encontrada automaticamente.")
    print("     Sera preciso adicionar manualmente.")

# ═════════════════════════════════════════════════════════════════════
# 5. Adicionar campos novos ao payload dadosAnamnese
# ═════════════════════════════════════════════════════════════════════
# Ancora: ultima linha do objeto, logo antes do '}' final
ancora_pay = """      emagrecedores: Object.keys(form.emagrecedores).length ? form.emagrecedores : null,
    }"""
novo_pay = """      emagrecedores: Object.keys(form.emagrecedores).length ? form.emagrecedores : null,
      gestacoes_previas: form.gestacoes_previas !== '' ? parseInt(form.gestacoes_previas) : null,
      abortamentos_espontaneos: form.abortamentos_espontaneos,
      indicacao_cirurgia: form.indicacao_cirurgia || null,
    }"""

if "gestacoes_previas:" in oba_src.split("const dadosAnamnese")[1][:2500] if "const dadosAnamnese" in oba_src else False:
    print("AVISO 5: payload ja atualizado.")
elif ancora_pay in oba_src:
    oba_src = oba_src.replace(ancora_pay, novo_pay, 1)
    print("OK 5: payload dadosAnamnese atualizado com 3 campos novos.")
else:
    problemas.append("5: ancora do payload nao encontrada")
    print("ERRO 5: ancora do payload dadosAnamnese nao encontrada.")

# ═════════════════════════════════════════════════════════════════════
# 6. Render do radio "Indicacao da cirurgia" + inputs de gestacoes
# ═════════════════════════════════════════════════════════════════════
# Vamos adicionar esses UI logo apos o RadioGroup de "Tipo de cirurgia"
ancora_ui = """          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>Tipo de cirurgia</label>
          <RadioGroup options={TIPOS_CIRURGIA} value={form.tipo_cirurgia} onChange={v => sf('tipo_cirurgia', v)} />"""

novo_ui = """          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>Tipo de cirurgia</label>
          <RadioGroup options={TIPOS_CIRURGIA} value={form.tipo_cirurgia} onChange={v => sf('tipo_cirurgia', v)} />

          <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>Indicação da cirurgia</label>
          <RadioGroup
            options={['OBESIDADE','METABÓLICA','OBESIDADE + DIABETES','HEMOCROMATOSE','GASTRECTOMIA POR OUTRAS CAUSAS']}
            value={form.indicacao_cirurgia}
            onChange={v => sf('indicacao_cirurgia', v)}
          />

          {sexo === 'F' && (
            <>
              <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>Número de gestações prévias</label>
              <input
                style={inp}
                type="number"
                min="0"
                max="20"
                step="1"
                placeholder="Ex: 2 (digite 0 se nunca engravidou)"
                value={form.gestacoes_previas}
                onChange={e => sf('gestacoes_previas', e.target.value)}
              />

              {form.gestacoes_previas !== '' && parseInt(form.gestacoes_previas) > 0 && (
                <>
                  <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#374151', marginBottom:'0.4rem', marginTop:'0.8rem' }}>Teve abortamentos espontâneos?</label>
                  <RadioGroup
                    options={['SIM','NÃO']}
                    value={form.abortamentos_espontaneos === true ? 'SIM' : form.abortamentos_espontaneos === false ? 'NÃO' : ''}
                    onChange={v => sf('abortamentos_espontaneos', v === 'SIM')}
                  />
                </>
              )}
            </>
          )}"""

if "Indicação da cirurgia" in oba_src:
    print("AVISO 6: UI novas ja existem.")
elif ancora_ui in oba_src:
    oba_src = oba_src.replace(ancora_ui, novo_ui, 1)
    print("OK 6: UI novas (indicacao, gestacoes, abortamentos) adicionadas.")
else:
    problemas.append("6: ancora de UI (Tipo de cirurgia) nao encontrada")
    print("ERRO 6: ancora de 'Tipo de cirurgia' nao encontrada.")

OBA.write_text(oba_src, encoding="utf-8")

# ═════════════════════════════════════════════════════════════════════
# 7. Atualizar buildModAcompanhamento (obaEngine.js) para incluir G3
# ═════════════════════════════════════════════════════════════════════
ancora_g = """  const G1 = ['HEMATOLOGISTA', 'GASTROENTEROLOGISTA', 'ENDOCRINOLOGISTA', 'CLÍNICO', 'CLINICO']
  const G2 = ['NUTRÓLOGO', 'NUTROLOGO', 'NUTRICIONISTA', 'CIRURGIÃO', 'CIRURGIAO', 'PSICÓLOGO', 'PSICOLOGO', 'PSIQUIATRA']"""
novo_g = """  const G1 = ['HEMATOLOGISTA', 'GASTROENTEROLOGISTA', 'ENDOCRINOLOGISTA', 'CLÍNICO', 'CLINICO']
  const G2 = ['NUTRÓLOGO', 'NUTROLOGO', 'NUTRICIONISTA', 'CIRURGIÃO', 'CIRURGIAO', 'PSICÓLOGO', 'PSICOLOGO', 'PSIQUIATRA']
  const G3 = ['PNEUMOLOGISTA', 'NEFROLOGISTA', 'UROLOGISTA', 'DERMATOLOGISTA']"""

# Tambem usar G3 apos a logica de G2 (adicionar menção na lista)
ancora_g2_ret = """  const temG2 = especialistas.filter(e => G2.includes((e || '').toUpperCase()))"""
novo_g3_ret = """  const temG2 = especialistas.filter(e => G2.includes((e || '').toUpperCase()))
  const temG3 = especialistas.filter(e => G3.includes((e || '').toUpperCase()))"""

if "const G3 = " in eng_src:
    print("AVISO 7: G3 ja existe em buildModAcompanhamento.")
elif ancora_g in eng_src:
    eng_src = eng_src.replace(ancora_g, novo_g, 1)
    if ancora_g2_ret in eng_src:
        eng_src = eng_src.replace(ancora_g2_ret, novo_g3_ret, 1)
        print("OK 7: G3 adicionado em buildModAcompanhamento.")

    # Adicionar mencao no texto quando houver G3
    # Encontrar linha "ESPECIALISTAS CRÍTICOS: ${temG1.join(', ')}."
    # e enriquecer com G3
    # Por simplicidade, vou apenas mudar linhas que usam "${temG2.join"
    # para incluir tb G3 se existir
    # Mas isso e trabalhoso. Vou so garantir que G3 seja exibido como info
    # nos blocos de "COMPLEMENTARES"
    old_comp = 'linhas.push(`COMPLEMENTARES: ${temG2.join(\', \')}.`)'
    new_comp = 'linhas.push(`COMPLEMENTARES: ${temG2.join(\', \')}.`)\n      if (temG3.length > 0) linhas.push(`ESPECIALIZADOS DE APOIO: ${temG3.join(\', \')}.`)'
    if old_comp in eng_src:
        # trocar em ambas as ocorrencias (linhas da logica de 1 G1 e >=2 G1)
        eng_src = eng_src.replace(old_comp, new_comp)
        print("  OK 7-bis: linhas de 'COMPLEMENTARES' agora mencionam G3 quando presente.")
    ENG.write_text(eng_src, encoding="utf-8")
else:
    problemas.append("7: ancora G1/G2 em buildModAcompanhamento nao encontrada")
    print("ERRO 7: ancora G1/G2 nao encontrada no engine.")

# ═════════════════════════════════════════════════════════════════════
# RESUMO
# ═════════════════════════════════════════════════════════════════════
print("\n" + "=" * 60)
if problemas:
    print(f"ATENCAO: {len(problemas)} problema(s) detectado(s):")
    for p in problemas:
        print(f"  - {p}")
    print("Revise o codigo manualmente.")
else:
    print("GRUPO A PARTE 1 APLICADO COM SUCESSO!")
print("=" * 60)
print()
print("Arquivos modificados:")
print(f"  - {OBA}")
print(f"  - {ENG}")
print()
print("MUDANCAS:")
print("  1. Campos no state: gestacoes_previas, abortamentos_espontaneos, indicacao_cirurgia")
print("  2. ESPECIALISTAS: +PNEUMOLOGISTA, NEFROLOGISTA, UROLOGISTA, DERMATOLOGISTA")
print("  3. COMPULSOES:    +CIGARRO/TABACO, CANNABIS")
print("  4. Fibromialgia:  +GABAPENTINA, PREGABALINA")
print("  5. Payload dadosAnamnese: 3 novos campos persistidos")
print("  6. UI: radio Indicacao da cirurgia + gestacoes/abortamentos (se sexo F)")
print("  7. buildModAcompanhamento: G3 adicionado (Especializados de Apoio)")
print()
print("Proximo passo:")
print('  git add . && git commit -m "feat: grupo A parte 1 - gestacoes, indicacao cirurgia, G3, cannabis, pregabalina" && git push origin main')
