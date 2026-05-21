$ErrorActionPreference = 'Stop'
$f = 'src\components\TriagemModal.jsx'
if (-not (Test-Path $f)) { Write-Host 'ERRO: rode na raiz do projeto.'; exit 1 }
$c = Get-Content $f -Raw

# Ancoras: inicio e fim exatos da funcao atual
$startMark = '  async function handleBuscarHistorico() {'
$s = $c.IndexOf($startMark)
if ($s -lt 0) { Write-Host 'NAO ENCONTROU: inicio handleBuscarHistorico'; exit 1 }

# fim = primeira ocorrencia de "setHistoricoData({ cpf: cpfDigits, avaliacoes: data });" + linha de fechamento "  }"
$endTok = 'setHistoricoData({ cpf: cpfDigits, avaliacoes: data });'
$e = $c.IndexOf($endTok, $s)
if ($e -lt 0) { Write-Host 'NAO ENCONTROU: fim (setHistoricoData)'; exit 1 }
$closeBrace = $c.IndexOf('  }', $e)
if ($closeBrace -lt 0) { Write-Host 'NAO ENCONTROU: fechamento da funcao'; exit 1 }
$endPos = $closeBrace + 3

$nova = @'
  async function handleBuscarHistorico() {
    const cpfDigits = String(inputs.cpf || '').replace(/\D/g, '');
    if (cpfDigits.length !== 11) {
      setHistoricoMsg('Informe um CPF v\u00e1lido (11 d\u00edgitos) antes de buscar.');
      setTimeout(() => setHistoricoMsg(''), 4000);
      return;
    }
    setHistoricoBuscando(true);
    setHistoricoMsg('');

    // Busca paralela: triagens (Hb/VCM/RDW, data = created_at) + avaliacoes (tudo, data = data_coleta)
    const [tRes, aRes] = await Promise.all([
      supabase
        .from('triagens')
        .select('created_at, hemoglobina, vcm, rdw')
        .eq('cpf', cpfDigits)
        .order('created_at', { ascending: true }),
      supabase
        .from('avaliacoes')
        .select('data_coleta, hemoglobina, vcm, rdw, ferritina, sat_transf')
        .eq('cpf', cpfDigits)
        .order('data_coleta', { ascending: true }),
    ]);

    setHistoricoBuscando(false);

    if (tRes.error && aRes.error) {
      setHistoricoMsg('Erro ao buscar hist\u00f3rico. Tente novamente.');
      setTimeout(() => setHistoricoMsg(''), 4000);
      return;
    }

    const norm = (v) => {
      const n = Number(v);
      return (v === null || v === undefined || v === '' || isNaN(n)) ? null : n;
    };

    const serie = [];

    (tRes.data || []).forEach((r) => {
      serie.push({
        data: r.created_at,
        hb: norm(r.hemoglobina),
        vcm: norm(r.vcm),
        rdw: norm(r.rdw),
        ferritina: null,
        sat: null,
        origem: 'triagem',
      });
    });

    (aRes.data || []).forEach((r) => {
      serie.push({
        data: r.data_coleta,
        hb: norm(r.hemoglobina),
        vcm: norm(r.vcm),
        rdw: norm(r.rdw),
        ferritina: norm(r.ferritina),
        sat: norm(r.sat_transf),
        origem: 'avaliacao',
      });
    });

    serie.sort((a, b) => new Date(a.data) - new Date(b.data));

    // Grafico 1 precisa de ao menos 2 pontos com Hb/VCM/RDW
    const pontosG1 = serie.filter((p) => p.hb !== null || p.vcm !== null || p.rdw !== null);
    if (pontosG1.length < 2) {
      setHistoricoMsg('N\u00c3O H\u00c1 ELEMENTOS PARA GR\u00c1FICO');
      setTimeout(() => setHistoricoMsg(''), 4000);
      return;
    }

    setHistoricoData({ cpf: cpfDigits, serie });
  }
'@

$c = $c.Substring(0, $s) + $nova + $c.Substring($endPos)

[System.IO.File]::WriteAllText((Resolve-Path $f), $c, (New-Object System.Text.UTF8Encoding($false)))

$ok = $c.Contains('setHistoricoData({ cpf: cpfDigits, serie });') -and $c.Contains("Promise.all([")
if ($ok) { Write-Host 'OK (handleBuscarHistorico reescrito: triagens + avaliacoes)' }
else { Write-Host 'PARCIAL: verificar' }
