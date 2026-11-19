param(
    [string]$BackendPath = '.deploy-validation/backend-perfis',
    [string]$PostgresBin = 'C:/Program Files/PostgreSQL/18/bin',
    [string]$JavaHome = 'C:/Program Files/Java/jdk-21.0.12.1',
    [string]$NodePath = 'node'
)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot
$backendRoot = (Resolve-Path -LiteralPath $BackendPath).Path
$runRoot = Join-Path $repoRoot ('.deploy-validation/perfis-local/run-' + [guid]::NewGuid().ToString('N'))
$dataRoot = Join-Path $runRoot 'postgres'
New-Item -ItemType Directory -Path $runRoot -Force | Out-Null
function Get-FreeLocalPort {
    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $port = $listener.LocalEndpoint.Port
    $listener.Stop()
    return $port
}
$postgresPort = Get-FreeLocalPort
$apiPort = Get-FreeLocalPort
$started = $false
$apiProcess = $null
$exitCode = 1
$savedEnvironment = @{}
$environmentNames = @('JAVA_HOME', 'Path', 'SPRING_DATASOURCE_URL', 'SPRING_DATASOURCE_USERNAME', 'SPRING_DATASOURCE_PASSWORD', 'ADMIN_NAME', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_SECTOR_NAME', 'JWT_SECRET', 'SERVER_PORT', 'CORS_ALLOWED_ORIGINS', 'FSPH_LOCAL_PROFILES', 'FSPH_PROFILES_API', 'FSPH_PROFILES_ADMIN_EMAIL', 'FSPH_PROFILES_PASSWORD', 'VITE_API_PROXY_TARGET', 'VITE_API_URL', 'VITE_API_BASE_URL', 'SPRING_PROFILES_ACTIVE', 'MAIL_NOTIFICATIONS_ENABLED', 'PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGSERVICE', 'PGSERVICEFILE', 'PGOPTIONS')
foreach ($key in $environmentNames) { $savedEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process') }
try {
    $env:JAVA_HOME = $JavaHome
    $env:Path = "$JavaHome/bin;$env:Path"
    foreach ($key in @('PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGSERVICE', 'PGSERVICEFILE', 'PGOPTIONS', 'SPRING_PROFILES_ACTIVE', 'VITE_API_URL')) { [Environment]::SetEnvironmentVariable($key, $null, 'Process') }
    & "$PostgresBin/initdb.exe" -D $dataRoot -U fsph_profile --auth-local=trust --auth-host=trust --encoding=UTF8 --locale=C *> (Join-Path $runRoot 'initdb.log')
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao inicializar PostgreSQL isolado.' }
    $postgresLog = Join-Path $runRoot 'postgres.log'
    $postgresStart = Start-Process -FilePath "$PostgresBin/pg_ctl.exe" -ArgumentList @('-D', ('"' + $dataRoot + '"'), '-l', ('"' + $postgresLog + '"'), '-o', ('"-h 127.0.0.1 -p ' + $postgresPort + ' -F"'), '-w', 'start') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runRoot 'postgres-start.log') -RedirectStandardError (Join-Path $runRoot 'postgres-start-error.log')
    $postgresStart.WaitForExit()
    $started = $true
    & "$PostgresBin/pg_isready.exe" -h 127.0.0.1 -p $postgresPort -U fsph_profile
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao iniciar PostgreSQL isolado.' }
    & "$PostgresBin/createdb.exe" -h 127.0.0.1 -p $postgresPort -U fsph_profile fsph_profiles
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar banco isolado.' }
    $ErrorActionPreference = 'Continue'
    & "$PostgresBin/psql.exe" -X -h 127.0.0.1 -p $postgresPort -U fsph_profile -d fsph_profiles -v ON_ERROR_STOP=1 -f (Join-Path $backendRoot 'src/test/resources/db/sector-catalog-regression.sql') *> (Join-Path $runRoot 'sector-catalog-test.log')
    $ErrorActionPreference = 'Stop'
    if ($LASTEXITCODE -ne 0) { throw "Regressão do catálogo de setores falhou. Consulte $runRoot/sector-catalog-test.log" }
    Push-Location -LiteralPath $backendRoot
    try {
        # Windows PowerShell wraps native stderr as ErrorRecord even on exit 0.
        $ErrorActionPreference = 'Continue'
        & .\mvnw.cmd -B '-Dtest=*Tests,!*IntegrationTests' package *> (Join-Path $runRoot 'backend-build.log')
        $ErrorActionPreference = 'Stop'
        if ($LASTEXITCODE -ne 0) { throw "Build/teste do backend falhou. Consulte $runRoot/backend-build.log" }
    } finally { $ErrorActionPreference = 'Stop'; Pop-Location }
    $env:SPRING_DATASOURCE_URL = "jdbc:postgresql://127.0.0.1:$postgresPort/fsph_profiles"
    $env:SPRING_DATASOURCE_USERNAME = 'fsph_profile'
    $env:SPRING_DATASOURCE_PASSWORD = ''
    $env:ADMIN_NAME = 'Administrador Local Perfis'
    $env:ADMIN_EMAIL = 'admin.perfis@fsph.test'
    $env:ADMIN_PASSWORD = 'PerfisLocal-2026!'
    $env:ADMIN_SECTOR_NAME = 'Administrativo'
    $env:JWT_SECRET = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
    $env:SERVER_PORT = "$apiPort"
    $env:CORS_ALLOWED_ORIGINS = 'http://127.0.0.1:5183'
    $env:MAIL_NOTIFICATIONS_ENABLED = 'false'
    $jar = Join-Path $backendRoot 'target/fsph-fleet-management-0.0.1-SNAPSHOT.jar'
    $apiProcess = Start-Process -FilePath "$JavaHome/bin/java.exe" -ArgumentList @('-jar', ('"' + $jar + '"')) -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runRoot 'backend.log') -RedirectStandardError (Join-Path $runRoot 'backend-error.log')
    $env:FSPH_LOCAL_PROFILES = '1'
    $env:FSPH_PROFILES_API = "http://127.0.0.1:$apiPort"
    $env:FSPH_PROFILES_ADMIN_EMAIL = $env:ADMIN_EMAIL
    $env:FSPH_PROFILES_PASSWORD = $env:ADMIN_PASSWORD
    $env:VITE_API_PROXY_TARGET = $env:FSPH_PROFILES_API
    $env:VITE_API_BASE_URL = '/api'
    $ready = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        if ($apiProcess.HasExited) { throw "API local encerrou. Consulte $runRoot/backend.log" }
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri "$env:FSPH_PROFILES_API/actuator/health" -TimeoutSec 2
            if ($response.StatusCode -eq 200) { $ready = $true; break }
        } catch { Start-Sleep -Seconds 1 }
    }
    if (!$ready) { throw 'API local não ficou disponível.' }
    $ErrorActionPreference = 'Continue'
    & $NodePath node_modules/@playwright/test/cli.js test --config e2e/profiles-local.config.ts
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
} finally {
    if ($apiProcess -and !$apiProcess.HasExited) { Stop-Process -Id $apiProcess.Id; $apiProcess.WaitForExit() }
    if ($started) { & "$PostgresBin/pg_ctl.exe" -D $dataRoot -m fast -w stop }
    foreach ($key in $savedEnvironment.Keys) { [Environment]::SetEnvironmentVariable($key, $savedEnvironment[$key], 'Process') }
    Write-Host "Artefatos: $runRoot e .deploy-validation/perfis-local. Nenhum banco externo foi usado."
}
exit $exitCode
