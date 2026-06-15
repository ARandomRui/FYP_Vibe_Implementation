@echo off
echo =========================================
echo 1. Running Vite Setup Help (Rule Check)
echo =========================================
call npx -y create-vite@latest --help

echo.
echo =========================================
echo 2. Initializing Vite React Project
echo =========================================
call npx -y create-vite@latest ./ --template react-ts

echo.
echo =========================================
echo 3. Installing Base Dependencies
echo =========================================
call npm install

echo.
echo =========================================
echo 4. Scanning Third-Party Dependencies
echo =========================================
curl.exe -s -X POST http://127.0.0.1:1742/dependency/scan -H "Content-Type: application/json" -d "{\"registry\": \"npm\", \"packages\": [{\"package\": \"react-pdf-highlighter\"}, {\"package\": \"@tiptap/react\"}, {\"package\": \"@tiptap/pm\"}, {\"package\": \"@tiptap/starter-kit\"}, {\"package\": \"@supabase/supabase-js\"}, {\"package\": \"lucide-react\"}, {\"package\": \"react-router-dom\"}]}"

echo.
echo.
echo Setup Complete! Please copy the output of the dependency scan and paste it back to me.
