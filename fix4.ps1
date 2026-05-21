$ErrorActionPreference = 'Stop'
$f = 'src\components\Calculator.jsx'
if (-not (Test-Path $f)) { Write-Host 'ERRO: rode na raiz do projeto.'; exit 1 }
$c = Get-Content $f -Raw

# ============================================================
# PARTE A - REVERTER fix3
# ============================================================

# A1: remover state showReversao (do CalculatorForm)
$rev_state = "`r`n  const [showReversao, setShowReversao] = useState(false);"
if ($c.Contains($rev_state)) { $c = $c.Replace($rev_state, '') }

# A2: restaurar onChange do checkbox AGORA NAO ao original
$cb_now = "// __FATIA1C__ Agora nao: abre modal de reversao`r`n                      setShowConviteAfiliado(false);`r`n                      setShowReversao(true);"
$cb_orig = "// __FATIA1C__ Agora nao: cadastra (TELA 7), pula afiliacao`r`n                      setAfiliacaoRecusada(true);`r`n                      setShowConviteAfiliado(false);`r`n                      setShowAuthMedicoOverlay('cadastro');"
if ($c.Contains($cb_now)) { $c = $c.Replace($cb_now, $cb_orig) }

# A3: remover o modal de reversao injetado no CalculatorForm
$mk1 = '{/* MODAL DE REVERSAO - apos declinar perfil (AGORA NAO) */}'
$i1 = $c.IndexOf($mk1)
if ($i1 -ge 0) {
  $tail = '{/* AUTH MEDICO OVERLAY - aparece apos convite aceito */}'
  $i2 = $c.IndexOf($tail, $i1)
  if ($i2 -lt 0) { Write-Host 'ERRO reverter: nao achou fim do modal injetado'; exit 1 }
  $c = $c.Substring(0, $i1) + $c.Substring($i2)
}

if ($c.Contains('showReversao')) { Write-Host 'ERRO: ainda restou referencia a showReversao apos reverter'; exit 1 }

# ============================================================
# PARTE B - ADICIONAR no AuthMedico
# ============================================================

# B1: state dentro do AuthMedico. Ancora: assinatura da funcao.
$sig = "function AuthMedico({ onConcluir, onVoltar, sessaoExpirada, modoInicial = 'cadastro', onVoltarParaConvite }) {"
if (-not $c.Contains($sig)) { Write-Host 'NAO ENCONTROU: assinatura AuthMedico'; exit 1 }
if ($c.Contains('showReversaoAdesao')) { Write-Host 'JA APLICADO: showReversaoAdesao existe'; exit 1 }
$sig_new = $sig + "`r`n  const [showReversaoAdesao, setShowReversaoAdesao] = useState(false);"
$c = $c.Replace($sig, $sig_new)

# B2: botao discreto abaixo do botao "Continue" (linha do handleCadastro)
# Ancora: o fechamento do botao Continue dentro do bloco cadastro.
$btnEnd = "{cadLoading ? 'Cadastrando...' : 'Continue"
$bp = $c.IndexOf($btnEnd)
if ($bp -lt 0) { Write-Host 'NAO ENCONTROU: botao Continue (handleCadastro)'; exit 1 }
$closeBtn = $c.IndexOf('</button>', $bp)
if ($closeBtn -lt 0) { Write-Host 'NAO ENCONTROU: fechamento do botao Continue'; exit 1 }
$insAt = $closeBtn + '</button>'.Length
$declineBtn = "`r`n            <button type=`"button`" onClick={() => setShowReversaoAdesao(true)}`r`n              className=`"w-full text-center text-gray-400 hover:text-gray-600 text-xs font-medium py-1`">`r`n              {`"N\u00e3o quero fornecer esses dados agora`"}`r`n            </button>"
$c = $c.Substring(0, $insAt) + $declineBtn + $c.Substring($insAt)

# B3: modal de reversao dentro do AuthMedico, antes do "Modal Esqueci a senha"
$mkEsq = '{/* Modal Esqueci a senha */}'
$ep = $c.IndexOf($mkEsq)
if ($ep -lt 0) { Write-Host 'NAO ENCONTROU: ancora Modal Esqueci a senha'; exit 1 }

$modal = @'
{/* MODAL DE REVERSAO - declinar adesao (NOME/CELULAR/EMAIL) */}
        {showReversaoAdesao && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-6 space-y-5">
                <p style={{ color: '#374151', fontSize: '15px', fontWeight: 600, lineHeight: 1.5, textAlign: 'center', margin: 0 }}>
                  {"RedFairy"}<sup style={{ fontSize: '0.6em', verticalAlign: 'super' }}>{"\u00ae"}</sup>{" precisa do seu WhatsApp + e-mail para que voc\u00ea possa operar a plataforma, conhecer o Projeto OBA, e os benef\u00edcios do 4DOC - Programa Patrocinado de M\u00e9dicos Afiliados."}
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowReversaoAdesao(false)}
                    className="w-full bg-red-700 hover:bg-gray-400 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                    <span>{"QUERO CONTINUAR"}</span>
                    <span style={{ fontSize: '15px' }}>{"\u25ba"}</span>
                  </button>
                  <div className="text-center">
                    <button
                      onClick={() => { setShowReversaoAdesao(false); onVoltar?.(); }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold py-2.5 px-5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 mx-auto">
                      <span style={{ color: '#dc2626', fontSize: '15px' }}>{"\u25c4"}</span>
                      <span>{"SAIR"}</span>
                    </button>
                    <p style={{ color: '#7B1E1E', fontSize: '11px', margin: '6px 0 0' }}>{"Se mudar de ideia \u00e9 s\u00f3 voltar"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        
'@
$c = $c.Substring(0, $ep) + $modal + $c.Substring($ep)

[System.IO.File]::WriteAllText((Resolve-Path $f), $c, (New-Object System.Text.UTF8Encoding($false)))

$okState = $c.Contains('const [showReversaoAdesao, setShowReversaoAdesao] = useState(false);')
$okBtn = $c.Contains('setShowReversaoAdesao(true)')
$okModal = $c.Contains('MODAL DE REVERSAO - declinar adesao')
if ($okState -and $okBtn -and $okModal) { Write-Host 'OK (fix3 revertido + state + botao + modal no AuthMedico)' }
else { Write-Host ("PARCIAL: state=$okState btn=$okBtn modal=$okModal") }
