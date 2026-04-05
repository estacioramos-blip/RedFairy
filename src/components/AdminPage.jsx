import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminPage({ onVoltar }) {
  const [valor, setValor] = useState('');
  const [pixChave, setPixChave] = useState('');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    async function carregar() {
      const { data: valConfig } = await supabase
        .from('config').select('valor').eq('chave', 'valor_solicitacao_medica').single();
      const { data: pixConfig } = await supabase
        .from('config').select('valor').eq('chave', 'pix_chave').single();
      setValor(valConfig?.valor || '');
      setPixChave(pixConfig?.valor || '');
      setLoading(false);
    }
    carregar();
  }, []);

  async function salvar() {
    setSalvando(true);
    setSucesso('');

    await supabase.from('config').upsert(
      { chave: 'valor_solicitacao_medica', valor, descricao: 'Valor em R$ da solicitação médica via Pix' },
      { onConflict: 'chave' }
    );

    await supabase.from('config').upsert(
      { chave: 'pix_chave', valor: pixChave, descricao: 'Chave Pix para recebimento de solicitações médicas' },
      { onConflict: 'chave' }
    );

    setSalvando(false);
    setSucesso('Configurações salvas com sucesso!');
    setTimeout(() => setSucesso(''), 3000);
  }

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-red-700 text-white py-4 px-4 shadow-lg">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <button onClick={onVoltar}
            className="bg-red-800 hover:bg-red-900 rounded-lg px-3 py-1 text-xs font-medium transition-colors">
            ← Voltar
          </button>
          <h1 className="text-base font-bold">Painel Admin</h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">

          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-1">Solicitação Médica</h2>
            <p className="text-sm text-gray-400">Configure o valor e a chave Pix para recebimento.</p>
          </div>

          {loading ? (
            <p className="text-gray-400 text-sm text-center py-4">Carregando...</p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Valor da Solicitação Médica (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  placeholder="Ex: 50.00"
                  className={inputClass}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Valor único cobrado para emissão de qualquer solicitação médica (Sangria ou Ferro EV).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Chave Pix (KlipBit)
                </label>
                <input
                  type="text"
                  value={pixChave}
                  onChange={e => setPixChave(e.target.value)}
                  placeholder="Cole aqui a chave Pix ou o código copia-e-cola"
                  className={inputClass}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Pode ser e-mail, CPF, telefone, chave aleatória ou código copia-e-cola gerado pelo KlipBit.
                </p>
              </div>

              {/* Preview */}
              {pixChave && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview do QR Code</p>
                  <div className="flex justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(pixChave)}`}
                      alt="Preview QR Code"
                      className="rounded-xl border border-gray-200"
                      width={160}
                      height={160}
                    />
                  </div>
                  <p className="text-xs text-gray-400 text-center break-all">{pixChave}</p>
                </div>
              )}

              {sucesso && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center text-green-700 text-sm font-medium">
                  ✅ {sucesso}
                </div>
              )}

              <button
                onClick={salvar}
                disabled={salvando}
                className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
                {salvando ? 'Salvando...' : 'Salvar configurações'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
