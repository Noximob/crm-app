# Script de Deploy Manual para Netlify
# Use apenas quando necessário - o deploy automático deve ser a regra

Write-Host "🚀 Iniciando deploy manual..." -ForegroundColor Green

# Build do projeto
Write-Host "📦 Fazendo build..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no build!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build concluído!" -ForegroundColor Green

# Verificar se a pasta out existe
if (-not (Test-Path "out")) {
    Write-Host "❌ Pasta 'out' não encontrada!" -ForegroundColor Red
    exit 1
}

Write-Host "📁 Pasta 'out' encontrada!" -ForegroundColor Green

# Deploy para Netlify
Write-Host "🌐 Fazendo deploy para Netlify..." -ForegroundColor Yellow
npx netlify deploy --dir=out --prod

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro no deploy!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Deploy concluído com sucesso!" -ForegroundColor Green
Write-Host "🎉 Seu site está atualizado no Netlify!" -ForegroundColor Cyan 