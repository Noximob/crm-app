# Script para fazer deploy das funcoes do Firebase e regras do Firestore
Write-Host "Iniciando deploy das funcoes e regras do Firebase..." -ForegroundColor Green

# Deploy das regras do Firestore
Write-Host "Deployando regras do Firestore..." -ForegroundColor Yellow
firebase deploy --only firestore:rules

# Deploy dos indices do Firestore
Write-Host "Deployando indices do Firestore..." -ForegroundColor Yellow
firebase deploy --only firestore:indexes

# Deploy das funcoes
Write-Host "Deployando funcoes do Firebase..." -ForegroundColor Yellow
firebase deploy --only functions

Write-Host "Deploy concluido!" -ForegroundColor Green
Write-Host "Para ver os logs das funcoes, use: firebase functions:log" -ForegroundColor Cyan 