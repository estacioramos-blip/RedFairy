$ErrorActionPreference = 'Stop'
$f = 'src\components\Calculator.jsx'
if (-not (Test-Path $f)) { Write-Host 'ERRO: rode na raiz do projeto.'; exit 1 }
$c = Get-Content $f -Raw

if ($c.Contains('setShowReversao')) { Write-Host 'JA APLICADO: showReversao ja existe. Abortado.'; exit 1 }

# ===== EDICAO 1: state novo =====
$s_old = 'const [afiliacaoRecusada, setAfiliacaoRecusada] = useState(false);'
if (-not $c.Contains($s_old)) { Write-Host 'NAO ENCONTROU: state afiliacaoRecusada'; exit 1 }
$s_new = $s_old + "`r`n  const [showReversao, setShowReversao] = useState(false);"
$c = $c.Replace($s_old, $s_new)

# ===== EDICAO 2: corpo do onChange do checkbox AGORA NAO =====
$mark = '// __FATIA1C__ Agora nao: cadastra (TELA 7), pula afiliacao'
$p1 = $c.IndexOf($mark)
if ($p1 -lt 0) { Write-Host 'NAO ENCONTROU: comentario __FATIA1C__'; exit 1 }
$endTok = "setShowAuthMedicoOverlay('cadastro');"
$p2 = $c.IndexOf($endTok, $p1)
if ($p2 -lt 0) { Write-Host 'NAO ENCONTROU: fim do bloco onChange'; exit 1 }
$p2end = $p2 + $endTok.Length
$novoTrecho = "// __FATIA1C__ Agora nao: abre modal de reversao`r`n                      setShowConviteAfiliado(false);`r`n                      setShowReversao(true);"
$c = $c.Substring(0, $p1) + $novoTrecho + $c.Substring($p2end)

# ===== EDICAO 3: modal de reversao =====
$anchor = '{/* AUTH MEDICO OVERLAY - aparece apos convite aceito */}'
$a = $c.IndexOf($anchor)
if ($a -lt 0) { Write-Host 'NAO ENCONTROU: ancora AUTH MEDICO OVERLAY'; exit 1 }

$modal = @'
{/* MODAL DE REVERSAO - apos declinar perfil (AGORA NAO) */}
      {showReversao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 space-y-5">
              <p style={{ color: '#374151', fontSize: '15px', fontWeight: 600, lineHeight: 1.5, textAlign: 'center', margin: 0 }}>
                {"RedFairy"}<sup style={{ fontSize: '0.6em', verticalAlign: 'super' }}>{"\u00ae"}</sup>{" precisa do seu WhatsApp + e-mail para que voc\u00ea possa operar a plataforma, conhecer o Projeto OBA, e os benef\u00edcios do 4DOC - Programa Patrocinado de M\u00e9dicos Afiliados."}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => { setShowReversao(false); setShowConviteAfiliado(true); }}
                  className="w-full bg-red-700 hover:bg-gray-400 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                  <span>{"QUERO CONTINUAR"}</span>
                  <span style={{ fontSize: '15px' }}>{"\u25ba"}</span>
                </button>
                <div className="text-center">
                  <button
                    onClick={() => { setShowReversao(false); if (onVoltar) onVoltar(); }}
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
$c = $c.Substring(0, $a) + $modal + $c.Substring($a)

[System.IO.File]::WriteAllText((Resolve-Path $f), $c, (New-Object System.Text.UTF8Encoding($false)))

$ok1 = $c.Contains('const [showReversao, setShowReversao] = useState(false);')
$ok2 = $c.Contains('// __FATIA1C__ Agora nao: abre modal de reversao')
$ok3 = $c.Contains('QUERO CONTINUAR')
if ($ok1 -and $ok2 -and $ok3) { Write-Host 'OK trocado (state + checkbox + modal)' }
else { Write-Host ("PARCIAL: state=$ok1 checkbox=$ok2 modal=$ok3") }
