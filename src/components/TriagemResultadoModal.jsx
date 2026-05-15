import { useState, useEffect } from 'react';import { supabase } from '../lib/supabase'
import logo from '../assets/logo.png'

/**
 * TriagemResultadoModal — popup azul de resultado da triagem.
 *
 * Props:
 *   resultado:  objeto retornado por triagemEritron()
 *   inputs:     dados do paciente (cpf, sexo, idade, gestante, hb, vcm, rdw)
 *   modoMedico: boolean
 *   isDemo:     boolean (so paciente nao logado)
 *   medicoCRM:  string (so se modoMedico)
 *   userId:     string (so se paciente logado, para link no Supabase)
 *   onVoltarInicio: function() — usuario clicou "Voltar ao inicio" (sair)
 *   onCadastrar:    function() — usuario DEMO clicou "Continuar para cadastro"
 */
export default function TriagemResultadoModal({
  resultado,
  inputs,
  modoMedico = false,
  isDemo = false,
  medicoCRM = null,
  onAprofundar = null,
  userId = null,
  onVoltarInicio,
  onCadastrar
}) {
  const [tela, setTela] = useState('resultado') // 'resultado' | 'aguardo'
  const [salvando, setSalvando] = useState(false)
  const [erroSalvamento, setErroSalvamento] = useState(null)

  if (!resultado) return null

  const isNormal = resultado.label === 'HEMOGLOBINA NORMAL + HEMÁCIAS NORMOCÍTICAS'
  const showCadastroBtn = !modoMedico && isDemo

  async function salvarTriagem() {
    if (!inputs?.cpf) {
      // Paciente DEMO sem CPF nao salva (sem identificacao)
      return { sucesso: true, semCPF: true }
    }
    try {
      const dados = {
        cpf: (inputs.cpf || '').replace(/\D/g, ''),
        user_id: userId || null,
        modo_medico: modoMedico,
        medico_crm: medicoCRM || null,
        sexo: inputs.sexo,
        idade: Number(inputs.idade) || null,
        data_nascimento: inputs.data_nascimento || null,
        gestante: inputs.gestante || false,
        bariatrica: inputs.bariatrica || false,
        semanas_gestacao: inputs.semanas_gestacao || null,
        hemoglobina: Number(inputs.hemoglobina) || null,
        vcm: Number(inputs.vcm) || null,
        rdw: Number(inputs.rdw) || null,
        label: resultado.label,
        classificacao_hb: resultado.classificacaoHb,
        classificacao_vcm: resultado.classificacaoVCM,
        is_anisocitica: resultado.isAnisocitica || false,
        gravidade_hb: resultado.gravidadeHb || null,
        color: resultado.color
      }
      const { error } = await supabase.from('triagens').insert(dados)
      if (error) {
        console.error('Erro ao salvar triagem:', error)
        return { sucesso: false, erro: error.message }
      }
      return { sucesso: true }
    } catch (err) {
      console.error('Erro inesperado ao salvar:', err)
      return { sucesso: false, erro: err.message }
    }
  }

  async function handleContinuar() {
    setSalvando(true)
    const resp = await salvarTriagem()
    setSalvando(false)
    if (!resp.sucesso) {
      setErroSalvamento('Não foi possível salvar. Tente novamente ou contate o suporte.')
      return
    }
    setTela('aguardo')
  }

  async function handleCadastrarComSalvamento() {
    setSalvando(true)
    await salvarTriagem()
    setSalvando(false)
    onCadastrar()
  }

  // ===== TELA AGUARDO =====
  if (tela === 'aguardo') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)' }}>
        <div className="bg-white rounded-2xl max-w-md w-full max-h-[95vh] overflow-y-auto shadow-2xl">
          {/* Cabecalho centralizado com fadinha */}
          <div className="bg-white px-6 pt-6 pb-4 rounded-t-2xl text-center">
            <img src={logo} alt="RedFairy" className="w-20 h-20 object-contain mx-auto mb-2" />
            <h2 className="text-2xl font-bold text-red-700 leading-tight">RedFairy</h2>
            <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">✨ Triagem Salva</p>
            <h3 className="text-lg font-semibold text-gray-800 mt-3 leading-tight">
              {modoMedico ? 'Triagem salva' : 'Estaremos aguardando você!'}
            </h3>
          </div>

          <div className="p-6 space-y-4">
            <div className="text-center">
              <div className="text-5xl mb-3">🔬</div>
              {modoMedico && inputs?.bariatrica ? (
                /* CENARIO 2: Medico + Bariatrico */
                <p className="text-gray-800 leading-relaxed">
                  <strong>Doutor, paciente bariátrico exige uma investigação mais complexa,</strong> inclusive uma <strong>ANAMNESE ESPECÍFICA</strong>. Encaminhe o paciente para que se cadastre: nós cuidaremos de tudo e retornaremos a você com o resultado dessa avaliação.
                </p>
              ) : modoMedico ? (
                /* CENARIO 1: Medico nao-bariatrico */
                <p className="text-gray-800 leading-relaxed">
                  Se você tem também a <strong>FERRITINA</strong> e <strong>SATURAÇÃO DA TRANSFERRINA</strong> do paciente, podemos prosseguir para uma avaliação melhor.
                  <br /><br />
                  Se não tem esses dados, solicite e retorne, ou encaminhe o paciente para que se cadastre.
                </p>
              ) : (
                /* CENARIO 5: Paciente normal (logado ou similar) */
                <>
                  <p className="text-gray-800 leading-relaxed">
                    <strong>Quando tiver os resultados de FERRITINA e SATURAÇÃO DA TRANSFERRINA, retorne.</strong>
                  </p>
                  <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                    Seus dados foram salvos. Quando voltar com os exames complementares,
                    continuaremos a sua avaliação de onde paramos.
                  </p>
                </>
              )}
            </div>

            {!modoMedico && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
                <p className="text-sm text-blue-900 italic">
                  "Estaremos aguardando você! ✨"
                </p>
              </div>
            )}
          </div>

          <div className="px-6 pb-6 flex gap-3">
            {modoMedico && !inputs?.bariatrica && onAprofundar ? (
              <>
                <button
                  onClick={onAprofundar}
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold transition-colors text-sm"
                >
                  Aprofundar agora
                </button>
                <button
                  onClick={onVoltarInicio}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-sm"
                >
                  Continuar
                </button>
              </>
            ) : (
              <button
                onClick={onVoltarInicio}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold transition-colors text-sm"
              >
                Continuar
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ===== TELA RESULTADO =====
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[95vh] overflow-y-auto shadow-2xl">

        {/* Cabecalho centralizado com fadinha + label colorido */}
        <div className="bg-white px-6 pt-6 pb-4 rounded-t-2xl text-center">
          <img src={logo} alt="RedFairy" className="w-20 h-20 object-contain mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-red-700 leading-tight">RedFairy</h2>
          <p className="text-xs uppercase tracking-widest text-gray-500 mt-1">
            {isNormal ? '✅ Triagem Concluída' : '🩺 Triagem - Achados'}
          </p>
          <h3 className={`text-lg font-bold mt-3 leading-tight ${
            isNormal
              ? 'text-green-700'
              : resultado.color === 'red'
                ? 'text-red-700'
                : 'text-orange-600'
          }`}>{resultado.label}</h3>
          {(inputs?.cpf || inputs?.dataColeta) && (
            <p className="text-xs text-gray-700 mt-1 tracking-wide">
              {[inputs?.cpf, inputs?.dataColeta && inputs.dataColeta.split('-').reverse().join('')].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        <div className="p-6 space-y-4">
          {/* __TRIAGEM_TABELA_V1__ */}
          {(() => {
            const hb = parseFloat(inputs?.hemoglobina);
            const vcm = parseFloat(inputs?.vcm);
            const rdw = parseFloat(inputs?.rdw);
            const sexo = inputs?.sexo;
            const gestante = !!inputs?.gestante;
            let hbMin, hbMax;
            if (sexo === 'M') { hbMin = 13.5; hbMax = 17.5; }
            else if (gestante) { hbMin = 11.0; hbMax = 15.5; }
            else { hbMin = 12.0; hbMax = 15.5; }
            const hbInterp = isNaN(hb) ? '—' : (hb < hbMin ? '↓' : hb > hbMax ? '↑' : 'NORMAL');
            const vcmInterp = isNaN(vcm) ? '—' : (vcm < 80 ? '↓' : vcm > 100 ? '↑' : 'NORMAL');
            const rdwInterp = isNaN(rdw) ? '—' : (rdw > 15 ? 'AMPLIADO' : 'NORMAL');
            const cell = 'px-2 py-1.5 text-xs';
            const corInterp = (txt) => {
              if (txt === 'NORMAL') return 'text-gray-700';
              if (txt === '—') return 'text-gray-400';
              return 'text-red-700 font-semibold';
            };
            return (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 uppercase tracking-wide">
                      <th className={cell + ' text-left font-semibold'}>Parâmetro</th>
                      <th className={cell + ' text-right font-semibold'}>Valor</th>
                      <th className={cell + ' text-left font-semibold'}>Und</th>
                      <th className={cell + ' text-left font-semibold'}>Interpretação</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className={cell + ' font-medium text-gray-800'}>Hemoglobina</td>
                      <td className={cell + ' text-right tabular-nums'}>{isNaN(hb) ? '—' : hb.toFixed(1)}</td>
                      <td className={cell + ' text-gray-600'}>g/dL</td>
                      <td className={cell + ' ' + corInterp(hbInterp)}>{hbInterp}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className={cell + ' font-medium text-gray-800'}>Volume Globular Médio</td>
                      <td className={cell + ' text-right tabular-nums'}>{isNaN(vcm) ? '—' : vcm.toFixed(1)}</td>
                      <td className={cell + ' text-gray-600'}>fL</td>
                      <td className={cell + ' ' + corInterp(vcmInterp)}>{vcmInterp}</td>
                    </tr>
                    <tr>
                      <td className={cell + ' font-medium text-gray-800'}>RDW</td>
                      <td className={cell + ' text-right tabular-nums'}>{isNaN(rdw) ? '—' : rdw.toFixed(1)}</td>
                      <td className={cell + ' text-gray-600'}>CV %</td>
                      <td className={cell + ' ' + corInterp(rdwInterp)}>{rdwInterp}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* Bloco azul - recomendacao */}
          <div className="rounded-xl border-2 border-blue-300 bg-blue-50 p-4">
            {isNormal ? (
              modoMedico ? (
                /* ERITRON NORMAL - MODO MEDICO */
                <div className="space-y-2">
                  <p className="text-sm font-bold text-blue-900">
                    ✨ Aparentemente os exames do seu paciente estão bem
                  </p>
                  <p className="text-sm text-blue-900 leading-relaxed">
                    Mas ainda assim eles não revelariam uma <strong>baixa reserva</strong> ou
                    <strong> excesso de ferro</strong>. Recomende ao paciente que traga a
                    <strong> FERRITINA</strong> e a <strong>SATURAÇÃO DA TRANSFERRINA</strong>.
                  </p>
                  <p className="text-sm text-blue-900 leading-relaxed">
                    Se {inputs?.sexo === 'F' ? 'ela' : 'ele'} não fez nenhum tratamento recente,
                    <strong> PARABÉNS!</strong> Vida que segue muito bem para {inputs?.sexo === 'F' ? 'ela' : 'ele'}.
                    Caso contrário, se {inputs?.sexo === 'F' ? 'ela' : 'ele'} fez ou está em tratamento, podemos cuidar {inputs?.sexo === 'F' ? 'dela' : 'dele'}.
                  </p>
                </div>
              ) : (
                /* ERITRON NORMAL - MODO PACIENTE */
                <div className="space-y-2">
                  <p className="text-sm font-bold text-blue-900">
                    ✨ Aparentemente seus exames estão bem
                  </p>
                  <p className="text-sm text-blue-900 leading-relaxed">
                    Mas ainda assim eles não revelariam uma <strong>baixa reserva</strong> ou
                    <strong> excesso de ferro</strong>. Recomendamos que você traga a
                    <strong> FERRITINA</strong> e a <strong>SATURAÇÃO DA TRANSFERRINA</strong>.
                  </p>
                  <p className="text-sm text-blue-900 leading-relaxed">
                    Se você não fez nenhum tratamento recente,
                    <strong> PARABÉNS!</strong> Vida que segue muito bem para você.
                    Caso contrário, se você fez ou está em tratamento, cuidaremos de você.
                  </p>
                </div>
              )
            ) : modoMedico ? (
              <div>
                <p className="text-xs uppercase tracking-widest text-blue-700 font-bold mb-2">
                  🩺 Para o(a) Doutor(a)
                </p>
                <p className="text-sm text-blue-900 leading-relaxed">
                  Doutor(a): para entender melhor o eritron do seu/sua paciente,
                  preciso da <strong>FERRITINA</strong> e da <strong>SATURAÇÃO DA
                  TRANSFERRINA</strong>. Solicite esses exames e traga os
                  resultados, ou o/a encaminhe para que se cadastre na
                  plataforma, daí eu cuido de tudo.
                </p>
              </div>
            ) : isDemo ? (
              <div>
                <p className="text-xs uppercase tracking-widest text-blue-700 font-bold mb-2">
                  ✨ Aprofundar Diagnóstico
                </p>
                <p className="text-sm text-blue-900 leading-relaxed mb-2">
                  Para um diagnóstico mais preciso, você precisa NO MÍNIMO de
                  <strong> FERRITINA</strong> e <strong>SATURAÇÃO DA TRANSFERRINA</strong>.
                  São de baixo custo, resultados rápidos, normalmente cobertos
                  por planos de saúde.
                </p>
                <p className="text-sm text-blue-900 leading-relaxed">
                  Ao se cadastrar aqui você terá <strong>acompanhamento por 1 ano</strong>,
                  e esse <strong>primeiro pedido de exames será gratuito</strong>.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs uppercase tracking-widest text-blue-700 font-bold mb-2">
                  ✨ Aprofundar Diagnóstico
                </p>
                <p className="text-sm text-blue-900 leading-relaxed">
                  Para um diagnóstico mais preciso, é necessário fazer
                  <strong> FERRITINA</strong> e <strong>SATURAÇÃO DA TRANSFERRINA</strong>.
                  São de baixo custo, resultados rápidos, normalmente cobertos
                  por planos de saúde. Solicite esses exames e traga os
                  resultados aqui para uma avaliação completa.
                </p>
              </div>
            )}
          </div>

          {/* Bloco amber bariatrica - so quando bariatrica e mostraCadastroBtn (paciente novo) */}
          {inputs?.bariatrica === true && showCadastroBtn && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm text-amber-900 leading-relaxed">
                Normalmente, a partir daqui, gravamos essas informações e pedimos ao paciente que retorne depois com FERRITINA e SATURAÇÃO DA TRANSFERRINA.
                <br /><br />
                Mas como <strong>você é {inputs?.sexo === 'F' ? 'bariátrica' : 'bariátrico'}</strong>, recomendamos o seu <strong>CADASTRO</strong> na plataforma, passando pela <strong>ANAMNESE</strong> completa. De lá vamos solicitar esses e outros exames para entender você, e tornar a sua vida melhor.
              </p>
            </div>
          )}

          {/* Frase rosa gestante - so quando F e gestante */}
          {inputs?.sexo === 'F' && inputs?.gestante === true && (
            <div className="rounded-xl border border-pink-200 bg-pink-50 p-4">
              <p className="text-sm text-pink-900 leading-relaxed">
                {modoMedico ? (
                  <>Lembre à sua paciente que <strong>gravidez e amamentação</strong> demandam muito <strong>ferro, vitaminas e minerais</strong> — é preciso estar com boas reservas.</>
                ) : (
                  <><strong>Gravidez e amamentação</strong> demandam muito <strong>ferro, vitaminas e minerais</strong> — é preciso estar com boas reservas.</>
                )}
              </p>
            </div>
          )}

          {erroSalvamento && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              ⚠️ {erroSalvamento}
            </div>
          )}
        </div>

        {/* Acoes */}
        <div className="px-6 pb-6 flex gap-3">
          {showCadastroBtn ? (
            <>
              <button
                onClick={handleContinuar}
                disabled={salvando}
                className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-wait"
              >
                {salvando ? 'Salvando...' : 'Agora não'}
              </button>
              <button
                onClick={handleCadastrarComSalvamento}
                disabled={salvando}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold transition-colors text-sm disabled:opacity-50 disabled:cursor-wait"
              >
                {salvando ? 'Salvando...' : 'Continuar para o cadastro →'}
              </button>
            </>
          ) : (
            <button
              onClick={handleContinuar}
              disabled={salvando}
              className="flex-1 py-3 rounded-xl bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-bold transition-colors text-sm disabled:opacity-50 disabled:cursor-wait"
            >
              {salvando ? 'Salvando...' : 'Continue'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
