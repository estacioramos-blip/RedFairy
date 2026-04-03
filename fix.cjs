const fs = require('fs');

let pd = fs.readFileSync('src/components/PatientDashboard.jsx', 'utf8');

pd = pd.replace(
  '<span className="text-2xl">🧚</span>',
  '<img src="/logo.png" alt="RedFairy" className="w-8 h-8 object-contain" style={{ filter: "drop-shadow(0 0 8px rgba(239,68,68,0.6))" }} />'
);

fs.writeFileSync('src/components/PatientDashboard.jsx', pd);
console.log('Done PatientDashboard.jsx');