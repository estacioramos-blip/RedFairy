// Mantém o Supabase acordado enquanto o projeto está no plano gratuito.
//
// O plano free PAUSA o projeto depois de ~7 dias sem atividade — e pausado, o
// app inteiro sai do ar sem aviso (aconteceu em 10/10/2026). A Vercel chama
// esta função 1×/dia (ver "crons" no vercel.json), e ela faz UMA leitura
// inofensiva: o id de um medicamento do catálogo (tabela de leitura pública).
// Não grava nem apaga nada.
//
// Quando o Supabase for para o plano pago, pode apagar este arquivo e o bloco
// "crons" do vercel.json.

export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return res.status(500).json({ ok: false, erro: 'variaveis do Supabase ausentes' });
  }
  try {
    const r = await fetch(`${url}/rest/v1/medicamentos?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    return res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, em: new Date().toISOString() });
  } catch (e) {
    return res.status(502).json({ ok: false, erro: String(e?.message || e) });
  }
}
