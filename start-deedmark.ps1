Set-Location "D:\Deedmark  Website\deedmark-app\deedmark-app"
npm run build
firebase emulators:start --export-on-exit=./emulator-data --import=./emulator-data