import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { avaliarPaciente, formatarParaCopiar } from '../engine/decisionEngine';
import ResultCard from './ResultCard';
import heroImg from '../assets/redfairy-hero.png';
import logo from '../assets/logo.png';

const IconPaciente = () => (
  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
    <circle cx="10" cy="6" r="3.5" stroke="#dc2626" strokeWidth="1.6"/>
    <path d="M3 18C3 14.134 6.134 11 10 11C13.866 11 17 14.134 17 18" stroke="#dc2626" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
)

const IconExames = () => (
  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
    <path d="M7 2H13V11L15.5 15.5C16.1 16.6 15.3 18 14 18H6C4.7 18 3.9 16.6 4.5 15.5L7 11V2Z" stroke="#dc2626" strokeWidth="1.6" strokeLinejoin="round"/>
    <path d="M7 8H13" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="8.5" cy="14" r="1" fill="#dc2626"/>
    <circle cx="11.5" cy="14" r="1" fill="#dc2626"/>
  </svg>
)

const IconHistorico = () => (
  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
    <rect x="4" y="2" width="12" height="16" rx="2" stroke="#dc2626" strokeWidth="1.6"/>
    <path d="M7 7H13" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M7 10H13" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M7 13H10" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

const IconMedicamentos = () => (
  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
    <rect x="3" y="8" width="14" height="8" rx="4" stroke="#dc2626" strokeWidth="1.6"/>
    <path d="M10 8V16" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M7 5C7 3.9 8.1 3 9.5 3H10.5C11.9 3 13 3.9 13 5V8H7V5Z" stroke="#dc2626" strokeWidth="1.6"/>
  </svg>
)

export default function Calculator({ onVoltar }) {
  const [inputs, setInputs] = useState({
    cpf: '',
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
    setInputs(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (erros[name]) setErros(prev => ({ ...prev, [name]: null }));
  }

  function validar() {
    const novosErros = {};
    if (!inputs.idade || inputs.idade < 12 || inputs.idade > 100)
      novosErros.idade = 'Idade inválida (12-100)';
    if (!inputs.dataColeta)
      novosErros.dataColeta = 'Informe a data da coleta';
    if (!inputs.ferritina)   novosErros.ferritina = 'Campo obrigatório';
    if (!inputs.hemoglobina) novosErros.hemoglobina = 'Campo obrigatório';
    if (!inputs.vcm)         novosErros.vcm = 'Campo obrigatório';
    if (!inputs.rdw)         novosErros.rdw = 'Campo obrigatório';
    if (!inputs.satTransf)   novosErros.satTransf = 'Campo obrigatório';
    return novosErros;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const novosErros = validar();
    if (Object.keys(novosErros).length > 0) { setErros(novosErros); return; }

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

    if (inputs.cpf.trim() && res.encontrado) {
      await supabase.from('avaliacoes').insert({
        cpf: inputs.cpf.replace(/\D/g, ''),
        data_coleta: inputs.dataColeta,
        ferritina: Number(inputs.ferritina),
        hemoglobina: Number(inputs.hemoglobina),
        vcm: Number(inputs.vcm),
        rdw: Number(inputs.rdw),
        sat_transf: Number(inputs.satTransf),
        bariatrica: inputs.bariatrica,
        vegetariano: inputs.vegetariano,
        perda: inputs.perda,
        hipermenorreia: inputs.hipermenorreia,
        gestante: inputs.gestante,
        aspirina: inputs.aspirina,
        vitamina_b12: inputs.vitaminaB12,
        ferro_oral: inputs.ferroOral,
        diagnostico_label: res.label,
        diagnostico_color: res.color,
      });
    }

    setTimeout(() => {
      document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth' });
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
      cpf: '', sexo: 'M', idade: '', dataColeta: '',
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

      <header className="bg-red-700 text-white py-4 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button onClick={onVoltar}
            className="bg-red-800 hover:bg-red-900 rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors">
            Voltar
          </button>
          <div className="flex items-center gap-3">
            <img src={logo} alt="RedFairy" className="w-8 h-8 object-contain"
              style={{ filter: 'brightness(10)' }} />
            <div>
              <h1 className="text-xl font-bold tracking-wide leading-tight">RedFairy</h1>
              <p className="text-red-200 text-xs">Calculadora Clínica - Eritron e Metabolismo do Ferro</p>
            </div>
          </div>
          <button onClick={() => setShowSobre(true)}
            className="bg-red-800 hover:bg-red-900 rounded-lg px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors">
            Sobre
          </button>
        </div>
      </header>

      {showSobre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => { setShowSobre(false); setShowSaibaMais(false); }}>
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ position: 'relative', width: '100%', height: '320px', overflow: 'hidden', borderRadius: '16px 16px 0 0' }}>
              <img src={heroImg} alt="RedFairy"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '20px' }}>
                <p style={{ color: 'white', fontSize: '14px', lineHeight: '1.8', fontStyle: 'italic', margin: 0, textAlign: 'center' }}>
                  Eu sou a sua fada vermelha, a sua{' '}
                  <span style={{ fontWeight: 'bold', color: '#fca5a5' }}>HEMOGLOBINA</span>.
                  <br />
                  Eu uso a poeira das estrelas para te entregar o ar.
                  <br />
                  <span style={{ fontWeight: '600' }}>Quanto tempo você vive sem ar?</span>
                </p>
              </div>
            </div>
            <div style={{ padding: '20px' }}>
              {!showSaibaMais && (
                <button onClick={() => setShowSaibaMais(true)}
                  className="w-full bg-red-700 hover:bg-red-800 text-white font-bold py-3 rounded-xl text-sm transition-colors mb-4">
                  Saiba Mais
                </button>
              )}
              {showSaibaMais && (
                <div style={{ marginBottom: '16px' }}>
                  <h3 className="text-red-700 font-bold text-base text-center mb-4">Vida e ventilação e perfusão</h3>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">
                    O Ferro em você veio das estrelas, e dele o vermelho do seu sangue - a sua potência.
                    Com Ferro, a Natureza faz a <strong>Hemoglobina</strong>, a proteína vermelha e mais importante da sua vida.
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">
                    Ela sustenta a ventilação e realiza a perfusão: capta o oxigênio do ar que ventila os pulmões
                    e o entrega a todas as suas células - vinte vezes por minuto. As células precisam do oxigênio
                    para queimar o alimento e obter a energia vital, sem a qual você só vive alguns minutos.
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">
                    Ao mesmo tempo, a Hemoglobina captura o CO2 produzido pela queima do alimento,
                    e o leva para que você o expire no ar do mundo.
                  </p>
                  <p className="text-gray-700 text-sm leading-relaxed mb-3">
                    No ambiente, uma proteína verde - a <strong>clorofila</strong>, mãe da Hemoglobina -
                    usa a luz do sol para partir o CO2 e fazer açúcar a partir de luz, carbono e água,
                    devolvendo o oxigênio ao ar do planeta, em um ciclo virtuoso perfeito.
                  </p>
                  <div className="mt-4 text-center">
  <p className="text-gray-500 text-xs font-medium">RT | E.F. Ramos, M.D.</p>
  <p className="text-red-700 text-xs mt-1">drestacioramos.com.br</p>
</div>
                </div>
              )}
              <button onClick={() => { setShowSobre(false); setShowSaibaMais(false); }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-3 py-5">
        <form onSubmit={handleSubmit} className="space-y-4">

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <IconPaciente /> Dados do Paciente
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">CPF</label>
                <input type="text" name="cpf" value={inputs.cpf}
                  onChange={handleChange} placeholder="000.000.000-00" maxLength={14}
                  inputMode="numeric" className="input" />
                <p className="text-xs text-gray-400 mt-0.5">Opcional — vincula ao paciente</p>
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
                <input type="number" name="idade" value={inputs.idade}
                  onChange={handleChange} placeholder="12-100" min={12} max={100}
                  className={`input ${erros.idade ? 'border-red-500' : ''}`} />
                {erros.idade && <p className="text-red-500 text-xs mt-1">{erros.idade}</p>}
              </div>
              <div>
                <label className="label">Data da Coleta</label>
                <input type="date" name="dataColeta" value={inputs.dataColeta}
                  onChange={handleChange}
                  className={`input ${erros.dataColeta ? 'border-red-500' : ''}`} />
                {erros.dataColeta && <p className="text-red-500 text-xs mt-1">{erros.dataColeta}</p>}
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <IconExames /> Exames Laboratoriais
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <LabInput label="Ferritina" unit="ng/mL" name="ferritina"
                reference={inputs.sexo === 'M' ? '24-336' : '25-150'}
                value={inputs.ferritina} onChange={handleChange} error={erros.ferritina} />
              <LabInput label="Hemoglobina" unit="g/dL" name="hemoglobina"
                reference={inputs.sexo === 'M' ? '13.5-17.5' : '12-15.5'}
                value={inputs.hemoglobina} onChange={handleChange} error={erros.hemoglobina} />
              <LabInput label="VCM" unit="fL" name="vcm" reference="80-100"
                value={inputs.vcm} onChange={handleChange} error={erros.vcm} />
              <LabInput label="RDW-CV" unit="%" name="rdw" reference="11.5-15"
                value={inputs.rdw} onChange={handleChange} error={erros.rdw} />
              <div className="col-span-2">
                <LabInput label="Sat. Transferrina" unit="%" name="satTransf" reference="20-50"
                  value={inputs.satTransf} onChange={handleChange} error={erros.satTransf} />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <IconHistorico /> Histórico Clínico
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

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <IconMedicamentos /> Medicamentos / Suplementos
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <CheckboxCard name="aspirina" label="Aspirina" sublabel="Uso contínuo" checked={inputs.aspirina} onChange={handleChange} color="orange" />
              <CheckboxCard name="vitaminaB12" label="Vitamina B12" sublabel="Últimos 3 meses" checked={inputs.vitaminaB12} onChange={handleChange} color="purple" />
              <div className="col-span-2">
                <CheckboxCard name="ferroOral" label="Ferro Oral / Injetável" sublabel="Nos últimos 2 anos" checked={inputs.ferroOral} onChange={handleChange} color="orange" />
              </div>
            </div>
          </section>

          <div className="flex gap-3">
            <button type="submit"
              className="flex-1 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-bold py-4 px-6 rounded-xl transition-colors shadow-md text-base">
              Avaliar Paciente
            </button>
            <button type="button" onClick={handleLimpar}
              className="bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700 font-medium py-4 px-5 rounded-xl transition-colors">
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
      <input type="number" step="0.1" name={name} value={value}
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