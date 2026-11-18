# Clona (ou atualiza) os 3 repositorios da Receita Federal em ./upstream
# Uso: powershell -File scripts/clone-upstream.ps1

$ErrorActionPreference = "Stop"

$repos = @(
    "calculadora-rtc-regime-regular",
    "calculadora-rtc-simples-nacional",
    "calculadora-rtc-gerador-danfse"
)

New-Item -ItemType Directory -Force upstream | Out-Null

foreach ($r in $repos) {
    $dest = Join-Path "upstream" $r
    if (Test-Path (Join-Path $dest ".git")) {
        Write-Host "Atualizando $r..."
        git -C $dest pull --ff-only
        if ($LASTEXITCODE -ne 0) { throw "Falha ao atualizar $r" }
    }
    else {
        Write-Host "Clonando $r..."
        # core.autocrlf=false evita quebra dos scripts Unix (mvnw) dentro do container Linux
        git -c core.autocrlf=false clone --depth 1 "https://github.com/ReceitaFederal/$r.git" $dest
        if ($LASTEXITCODE -ne 0) { throw "Falha ao clonar $r" }
    }
}

Write-Host "`nPronto. Agora: docker compose up -d --build"
