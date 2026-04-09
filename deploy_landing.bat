@echo off
echo Copiando landing page...
copy "C:\Users\Estacio\Downloads\redfairy-landing-final.html" "C:\Users\Estacio\Desktop\redfairy\public\index.html" /Y
copy "C:\Users\Estacio\Downloads\App.jsx" "C:\Users\Estacio\Desktop\redfairy\src\App.jsx" /Y
cd "C:\Users\Estacio\Desktop\redfairy"
git add .
git commit -m "feat: landing page como home + deep link modo medico/paciente"
git push origin main
echo Deploy concluido!
pause
