import { useState } from 'react';
import { avaliarPaciente, formatarParaCopiar } from '../engine/decisionEngine';
import ResultCard from './ResultCard';
import heroImg from '../assets/redfairy-hero.png';

export default function Calculator() {
  const [inputs, setInputs] = useState({
    iniciais: '',
    sexo: 'M',
    idade: '',
    dataColeta: '',
    ferritina: '',
    hemoglobina: '',
    vcm: '',
    rdw: '',
    satTransf: '',
    bariatrica: false,
    vegetariano: false,
    perda: false,
    hipermenorreia: false,
    gestante: false,
    alcoolista: false,
    transfundido: false,
    aspirina: false,
    vitaminaB12: false,
    ferroOral: false,
  });

  const [resultado, setResultado] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [erros, setErros] = useState({});
  const [showSobre, setShowSobre] = useState(false);
  const [showSaibaMais, setShowSaibaMais] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setInputs(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (erros[name]) {
      setErros(prev => ({ ...prev, [name]: null }));
    }
  }

  function validar() {
    const novosErros = {};
    if (!inputs.iniciais.trim())
      novosErros.iniciais = 'Informe as iniciais';
    if (!inputs.idade || inputs.idade < 12 || inputs.idade > 100)
      novosErros.idade = 'Idade inválida (12–100)';
    if (!inputs.dataColeta)
      novosErros.dataColeta = 'Informe a data da coleta';
    if (!inputs.ferritina)
      novosErros.ferritina = 'Campo obrigatório';
    if (!inputs.hemoglobina)
      novosErros.hemoglobina = 'Campo obrigatório';
    if (!inputs.vcm)
      novosErros.vcm = 'Campo obrigatório';
    if (!inputs.rdw)
      novosErros.rdw = 'Campo obrigatório';
    if (!inputs.satTransf)
      novosErros.satTransf = 'Campo obrigatório';
    return novosErros;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const novosErros = validar();
    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      return;
    }
    const inputsNumericos = {
      ...inputs,
      idade:       Number(inputs.idade),
      ferritina:   Number(inputs.ferritina),
      hemoglobina: Number(inputs.hemoglobina),
      vcm:         Number(inputs.vcm),
      rdw:         Number(inputs.rdw),
      satTransf:   Number(inputs.satTransf),
    };
    const res = avaliarPaciente(inputsNumericos);
    setResultado({ ...res, _inputs: inputsNumericos });
    setCopiado(false);
    setTimeout(() => {
      document.getElementById('resultado')
        ?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  function handleCopiar() {
    if (!resultado) return;
    const texto = formatarParaCopiar(resultado, resultado._inputs);
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    });
  }

  function handleLimpar() {
    setInputs({
      iniciais: '', sexo: 'M', idade: '', dataColeta: '',
      ferritina: '', hemoglobina: '', vcm: '', rdw: '',
      satTransf: '', bariatrica: false, vegetariano: false,
      perda: false, hipermenorreia: false, gestante: false,
      alcoolista: false, transfundido: false,
      aspirina: false, vitaminaB12: false, ferroOral: false,
    });
    setResultado(null);
    setErros({});
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <header className="bg-red-700 text-white py-4 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <span className="text-3xl">🧚‍♀️</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-wide leading-tight">RedFairy</h1>
            <p className="text-red-200 text-xs truncate">
              Calculadora Clínica — Eritron & Metabolismo do Ferro
            </p>
          </div>
          <button
            onClick={() => setShowSobre(true)}
            className="bg-red-800 hover:bg-red-900 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors"
          >
            Sobre
          </button>
        </div>
      </header>

      {/* MODAL SOBRE */}
      {showSobre && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => { setShowSobre(false); setShowSaibaMais(false); }}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Imagem com texto sobreposto */}
            <div className="relative w-full" style={{ height: '320px', overflow: 'hidden' }}>
  <img src={heroImg} alt="RedFairy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-5 py-4">
                <p className="text-white text-sm leading-relaxed italic">
                  Eu sou a sua fada vermelha, a sua{' '}
                  <span className="font-bold text-red-300">HEMOGLOBINA</span>.
                  <br />
                  Eu uso poeira de estrelas para te entregar o ar.
                  <br />
                  <span className="font-semibold">Quanto tempo você vive sem ar?</span>
                </p>
              </div>
            </div>

            {/* Corpo do modal */}
            <div className="p-5">
              {!showSaibaMais && (
                <button
                  onClick={() => setShowSaibaMais(true)}
                  className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl text-sm transition-colors mb-4"
                >
                  ✨ Saiba Mais
                </button>
              )}

              {showSaibaMais && (
                <div className="space-y-4 mb-4">
                  <h3 className="text-red-700 font-bold text-base text-center">
                    Vida é ventilação e perfusão
                  </h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    O Ferro em você veio das estrelas, é dele o vermelho do seu sangue — a sua potência.
                    Com Ferro, a Natureza faz a <strong>Hemoglobina</strong>, a proteína vermelha e mais
                    importante da sua vida.
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Ela sustenta a ventilação e realiza a perfusão: capta o oxigênio do ar que ventila
                    os pulmões e o entrega a todas as suas células — vinte vezes por minuto. As células
                    precisam do oxigênio para queimar o alimento e obter a energia vital, sem a qual
                    você só vive alguns minutos.
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    Ao mesmo tempo, a Hemoglobina captura o CO₂ produzido pela queima do alimento,
                    e o leva para que você o expire no ar do mundo.
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    No ambiente, uma proteína verde — a <strong>clorofila</strong>, mãe da Hemoglobina —
                    usa a luz do sol para partir o CO₂ e fazer açúcar a partir de luz, carbono e água,
                    devolvendo o oxigênio ao ar do planeta, em um ciclo virtuoso perfeito.
                  </p>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-800 text-sm leading-relaxed font-medium">
                      Portanto, é importante saber sobre sua Hemoglobina, o seu Ferro e a sua produção
                      de células vermelhas — conhecer o seu Eritron.
                    </p>
                    <p className="text-red-700 text-sm font-bold mt-2">
                      🧚‍♀️ Nós te ajudamos.
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => { setShowSobre(false); setShowSaibaMais(false); }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-3 py-5">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* DADOS DO PACIENTE */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-red-600">👤</span> Dados do Paciente
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Iniciais</label>
                <input
                  type="text" name="iniciais" value={inputs.iniciais}
                  onChange={handleChange} placeholder="Ex: JBS" maxLength={5}
                  className={`input ${erros.iniciais ? 'border-red-500' : ''}`}
                />
                {erros.iniciais && <p className="text-red-500 text-xs mt-1">{erros.iniciais}</p>}
              </div>
              <div>
                <label className="label">Sexo</label>
                <select name="sexo" value={inputs.sexo} onChange={handleChange} className="input">
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
              <div>
                <label className="label">Idade</label>
                <input
                  type="number" name="idade" value={inputs.idade}
                  onChange={handleChange} placeholder="12–100" min={12} max={100}
                  className={`input ${erros.idade ? 'border-red-500' : ''}`}
                />
                {erros.idade && <p className="text-red-500 text-xs mt-1">{erros.idade}</p>}
              </div>
              <div>
                <label className="label">Data da Coleta</label>
                <input
                  type="date" name="dataColeta" value={inputs.dataColeta}
                  onChange={handleChange}
                  className={`input ${erros.dataColeta ? 'border-red-500' : ''}`}
                />
                {erros.dataColeta && <p className="text-red-500 text-xs mt-1">{erros.dataColeta}</p>}
              </div>
            </div>
          </section>

          {/* EXAMES LABORATORIAIS */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-red-600">🧪</span> Exames Laboratoriais
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <LabInput label="Ferritina" unit="ng/mL" name="ferritina"
                reference={inputs.sexo === 'M' ? '24–336' : '25–150'}
                value={inputs.ferritina} onChange={handleChange} error={erros.ferritina} />
              <LabInput label="Hemoglobina" unit="g/dL" name="hemoglobina"
                reference={inputs.sexo === 'M' ? '13.5–17.5' : '12–15.5'}
                value={inputs.hemoglobina} onChange={handleChange} error={erros.hemoglobina} />
              <LabInput label="VCM" unit="fL" name="vcm" reference="80–100"
                value={inputs.vcm} onChange={handleChange} error={erros.vcm} />
              <LabInput label="RDW-CV" unit="%" name="rdw" reference="11.5–15"
                value={inputs.rdw} onChange={handleChange} error={erros.rdw} />
              <div className="col-span-2">
                <LabInput label="Sat. Transferrina" unit="%" name="satTransf" reference="20–50"
                  value={inputs.satTransf} onChange={handleChange} error={erros.satTransf} />
              </div>
            </div>
          </section>

          {/* HISTÓRICO CLÍNICO */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-red-600">📋</span> Histórico Clínico
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <CheckboxCard name="bariatrica" label="Bariátrica" sublabel="By-pass / Gastrectomia" checked={inputs.bariatrica} onChange={handleChange} color="amber" />
              <CheckboxCard name="vegetariano" label="Vegetariano/Vegano" sublabel="Dieta sem carne" checked={inputs.vegetariano} onChange={handleChange} color="green" />
              <CheckboxCard name="perda" label="Hemorragia" sublabel="Doações ou sangramento" checked={inputs.perda} onChange={handleChange} color="red" />
              <CheckboxCard name="alcoolista" label="Alcoolista" sublabel="Uso crônico de álcool" checked={inputs.alcoolista} onChange={handleChange} color="amber" />
              <CheckboxCard name="transfundido" label="Transfundido" sublabel="Transfusão de hemácias" checked={inputs.transfundido} onChange={handleChange} color="red" />
              {inputs.sexo === 'F' && (
                <>
                  <CheckboxCard name="hipermenorreia" label="Hipermenorreia" sublabel="Fluxo excessivo" checked={inputs.hipermenorreia} onChange={handleChange} color="pink" />
                  <CheckboxCard name="gestante" label="Gestante" sublabel="Gravidez atual" checked={inputs.gestante} onChange={handleChange} color="pink" />
                </>
              )}
            </div>
          </section>

          {/* MEDICAMENTOS */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="text-red-600">💊</span> Medicamentos / Suplementos
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <CheckboxCard name="aspirina" label="Aspirina" sublabel="Uso contínuo" checked={inputs.aspirina} onChange={handleChange} color="orange" />
              <CheckboxCard name="vitaminaB12" label="Vitamina B12" sublabel="Últimos 3 meses" checked={inputs.vitaminaB12} onChange={handleChange} color="purple" />
              <div className="col-span-2">
                <CheckboxCard name="ferroOral" label="Ferro Oral / Injetável" sublabel="Nos últimos 2 anos" checked={inputs.ferroOral} onChange={handleChange} color="orange" />
              </div>
            </div>
          </section>

          {/* BOTÕES */}
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-bold py-4 px-6 rounded-xl transition-colors shadow-md text-base"
            >
              🧚‍♀️ Avaliar Paciente
            </button>
            <button
              type="button" onClick={handleLimpar}
              className="bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 font-medium py-4 px-5 rounded-xl transition-colors"
            >
              Limpar
            </button>
          </div>

        </form>

        {resultado && (
          <div id="resultado" className="mt-6">
            <ResultCard resultado={resultado} onCopiar={handleCopiar} copiado={copiado} />
          </div>
        )}
      </main>
    </div>
  );
}

function LabInput({ label, unit, name, reference, value, onChange, error }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">
        {label} <span className="text-xs text-gray-400">({unit})</span>
      </label>
      <input
        type="number" step="0.1" name={name} value={value}
        onChange={onChange} inputMode="decimal"
        className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 ${error ? 'border-red-500' : 'border-gray-200'}`}
      />
      <p className="text-xs text-gray-400 mt-0.5">Ref: {reference}</p>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}

const colorMap = {
  amber:  'border-amber-400  bg-amber-50  text-amber-700',
  green:  'border-green-400  bg-green-50  text-green-700',
  red:    'border-red-400    bg-red-50    text-red-700',
  pink:   'border-pink-400   bg-pink-50   text-pink-700',
  orange: 'border-orange-400 bg-orange-50 text-orange-700',
  purple: 'border-purple-400 bg-purple-50 text-purple-700',
};

function CheckboxCard({ name, label, sublabel, checked, onChange, color }) {
  return (
    <label className={`flex items-start gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${checked ? colorMap[color] : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
      <input type="checkbox" name={name} checked={checked} onChange={onChange} className="mt-0.5 w-4 h-4 cursor-pointer flex-shrink-0" />
      <div className="min-w-0">
        <p className="font-medium text-sm leading-tight">{label}</p>
        <p className="text-xs opacity-70 leading-tight mt-0.5">{sublabel}</p>
      </div>
    </label>
  );
}