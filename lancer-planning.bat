@echo off
echo Lancement du serveur de developpement...
cd /d "D:\Logiciels\chrs-planning-app"
START "Serveur de developpement" /MIN npm run dev
echo Lancement de l'application dans le navigateur...
timeout /t 5 /nobreak > nul
start http://localhost:5173
exit
