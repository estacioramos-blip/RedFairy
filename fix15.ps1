$ErrorActionPreference = 'Stop'
$f = 'src\components\TriagemModal.jsx'
if (-not (Test-Path $f)) { Write-Host 'ERRO'; exit 1 }

$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

if ($c.Contains('data_coleta:')) { Write-Host 'JA APLICADO'; exit 1 }

$nl = "`r`n"

# ===== EDICAO 1: useState - acrescentar data_coleta + data_estimada apos rdw =====
$s_old = "    rdw: ''," + $nl + "  })"
$s_new = "    rdw: ''," + $nl + "    data_coleta: ''," + $nl + "    data_estimada: false," + $nl + "  })"
if (-not $c.Contains($s_old)) { Write-Host 'NAO ENCONTROU: useState (rdw + })'; exit 1 }
$c = $c.Replace($s_old, $s_new)

# ===== EDICAO 2: validacao - apos linha rdw =====
$vMatches = [regex]::Matches($c, "if \(\!inputs\.rdw\) errors\.rdw = 'Obrigat.*?rio'")
if ($vMatches.Count -ne 1) { Write-Host ("NAO ENCONTROU validacao rdw: " + $vMatches.Count); exit 1 }
$v_old = $vMatches[0].Value
$v_new = $v_old + $nl + "    if (!inputs.data_coleta) errors.data_coleta = 'Informe a data da coleta'"
$c = $c.Replace($v_old, $v_new)

# ===== EDICAO 3: JSX - bloco antes do Hemograma =====
$j_old = "          {pacienteConhecido !== 'BLOQUEADO' && (<>" + $nl + "          {/* __HEMOGRAMA_SEAMLESS_V1__ */}"
$bloco = @(
  "          {pacienteConhecido !== 'BLOQUEADO' && (<>"
  "          {/* __DATA_COLETA_TRIAGEM__ */}"
  "          <div>"
  '            <label className="block text-xs font-medium text-gray-600 mb-1">Data da coleta</label>'
  "            <input"
  '              type="date"'
  '              name="data_coleta"'
  "              value={inputs.data_coleta}"
  "              onChange={handleChange}"
  "              className={'w-full border-2 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ' + (erros.data_coleta ? 'border-red-500' : (inputs.data_coleta ? 'border-yellow-300 bg-yellow-50' : 'border-yellow-400 bg-yellow-50 focus:ring-yellow-400'))}"
  "            />"
  '            {erros.data_coleta && <p className="text-red-500 text-xs mt-1">{erros.data_coleta}</p>}'
  '            <label className="flex items-center gap-2 mt-2 cursor-pointer">'
  "              <input"
  '                type="checkbox"'
  '                name="data_estimada"'
  "                checked={inputs.data_estimada}"
  "                onChange={handleChange}"
  '                className="w-3.5 h-3.5"'
  "              />"
  '              <span className="text-xs text-gray-500">Data estimada</span>'
  "            </label>"
  "          </div>"
  ""
  "          {/* __HEMOGRAMA_SEAMLESS_V1__ */}"
)
$j_new = ($bloco -join $nl)
if (-not $c.Contains($j_old)) { Write-Host 'NAO ENCONTROU: ancora Hemograma'; exit 1 }
$c = $c.Replace($j_old, $j_new)

[System.IO.File]::WriteAllText((Resolve-Path $f), $c, (New-Object System.Text.UTF8Encoding($false)))

$ok1 = $c.Contains("data_coleta: ''")
$ok2 = $c.Contains("if (!inputs.data_coleta) errors.data_coleta")
$ok3 = $c.Contains('__DATA_COLETA_TRIAGEM__')

if ($ok1 -and $ok2 -and $ok3) { Write-Host 'OK (state + validacao + JSX)' }
else { Write-Host ("PARCIAL: state=$ok1 validacao=$ok2 jsx=$ok3") }
