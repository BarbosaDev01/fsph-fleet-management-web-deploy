param(
    [string]$BackendPath = '.deploy-validation/release-backend-20261119',
    [string]$PostgresBin = 'C:/Program Files/PostgreSQL/18/bin',
    [string]$JavaHome = 'C:/Program Files/Java/jdk-21.0.12.1',
    [string]$NodePath = 'node'
)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRoot
$backendRoot = (Resolve-Path -LiteralPath $BackendPath).Path
$runRoot = Join-Path $repoRoot ('.deploy-validation/svo-local/run-' + [guid]::NewGuid().ToString('N'))
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
$webPort = Get-FreeLocalPort
$started = $false
$apiProcess = $null
$exitCode = 1
$savedEnvironment = @{}
$environmentNames = @('JAVA_HOME', 'Path', 'FSPH_TEST_JDBC_URL', 'FSPH_SVO_WEB_PORT', 'SPRING_DATASOURCE_URL', 'SPRING_DATASOURCE_USERNAME', 'SPRING_DATASOURCE_PASSWORD', 'ADMIN_NAME', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_SECTOR_NAME', 'JWT_SECRET', 'SERVER_PORT', 'CORS_ALLOWED_ORIGINS', 'FSPH_LOCAL_SVO', 'FSPH_SVO_API', 'FSPH_SVO_ADMIN_EMAIL', 'FSPH_SVO_PASSWORD', 'VITE_API_PROXY_TARGET', 'VITE_API_URL', 'VITE_API_BASE_URL', 'SPRING_PROFILES_ACTIVE', 'MAIL_NOTIFICATIONS_ENABLED', 'PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGSERVICE', 'PGSERVICEFILE', 'PGOPTIONS')
foreach ($key in $environmentNames) { $savedEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process') }
try {
    $env:JAVA_HOME = $JavaHome
    $env:Path = "$JavaHome/bin;$env:Path"
    foreach ($key in @('PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGSERVICE', 'PGSERVICEFILE', 'PGOPTIONS', 'SPRING_PROFILES_ACTIVE', 'VITE_API_URL')) { [Environment]::SetEnvironmentVariable($key, $null, 'Process') }
    & "$PostgresBin/initdb.exe" -D $dataRoot -U fsph_svo_test --auth-local=trust --auth-host=trust --encoding=UTF8 --locale=C *> (Join-Path $runRoot 'initdb.log')
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao inicializar PostgreSQL isolado.' }
    $postgresLog = Join-Path $runRoot 'postgres.log'
    $postgresStart = Start-Process -FilePath "$PostgresBin/pg_ctl.exe" -ArgumentList @('-D', ('"' + $dataRoot + '"'), '-l', ('"' + $postgresLog + '"'), '-o', ('"-h 127.0.0.1 -p ' + $postgresPort + ' -F"'), '-w', 'start') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runRoot 'postgres-start.log') -RedirectStandardError (Join-Path $runRoot 'postgres-start-error.log')
    $postgresStart.WaitForExit()
    $started = $true
    & "$PostgresBin/pg_isready.exe" -h 127.0.0.1 -p $postgresPort -U fsph_svo_test
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao iniciar PostgreSQL isolado.' }
    & "$PostgresBin/createdb.exe" -h 127.0.0.1 -p $postgresPort -U fsph_svo_test fsph_svo_test
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar banco isolado.' }
    $ErrorActionPreference = 'Continue'
    & "$PostgresBin/psql.exe" -X -h 127.0.0.1 -p $postgresPort -U fsph_svo_test -d fsph_svo_test -v ON_ERROR_STOP=1 -f (Join-Path $backendRoot 'src/test/resources/db/sector-catalog-regression.sql') *> (Join-Path $runRoot 'sector-catalog-test.log')
    $ErrorActionPreference = 'Stop'
    if ($LASTEXITCODE -ne 0) { throw "Regressão do catálogo de setores falhou. Consulte $runRoot/sector-catalog-test.log" }
    & "$PostgresBin/createdb.exe" -h 127.0.0.1 -p $postgresPort -U fsph_svo_test fsph_svo_app
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar banco separado para o navegador.' }
    $env:FSPH_TEST_JDBC_URL = "jdbc:postgresql://127.0.0.1:$postgresPort/fsph_svo_test"
    Push-Location -LiteralPath $backendRoot
    try {
        # Windows PowerShell wraps native stderr as ErrorRecord even on exit 0.
        $ErrorActionPreference = 'Continue'
        & .\mvnw.cmd -B package *> (Join-Path $runRoot 'backend-build.log')
        $ErrorActionPreference = 'Stop'
        if ($LASTEXITCODE -ne 0) { throw "Build/teste do backend falhou. Consulte $runRoot/backend-build.log" }
    } finally { $ErrorActionPreference = 'Stop'; Pop-Location }
    $env:SPRING_DATASOURCE_URL = "jdbc:postgresql://127.0.0.1:$postgresPort/fsph_svo_app"
    $env:SPRING_DATASOURCE_USERNAME = 'fsph_svo_test'
    $env:SPRING_DATASOURCE_PASSWORD = ''
    $env:ADMIN_NAME = 'Administrador Local SVO'
    $env:ADMIN_EMAIL = 'admin.svo@fsph.test'
    $env:ADMIN_PASSWORD = 'SvoLocal-2026!'
    $env:ADMIN_SECTOR_NAME = 'Administrativo'
    $env:JWT_SECRET = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
    $env:SERVER_PORT = "$apiPort"
    $env:CORS_ALLOWED_ORIGINS = "http://127.0.0.1:$webPort"
    $env:FSPH_SVO_WEB_PORT = "$webPort"
    $env:MAIL_NOTIFICATIONS_ENABLED = 'false'
    $jar = Join-Path $backendRoot 'target/fsph-fleet-management-0.0.1-SNAPSHOT.jar'
    $apiProcess = Start-Process -FilePath "$JavaHome/bin/java.exe" -ArgumentList @('-jar', ('"' + $jar + '"')) -WorkingDirectory $repoRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runRoot 'backend.log') -RedirectStandardError (Join-Path $runRoot 'backend-error.log')
    $env:FSPH_LOCAL_SVO = '1'
    $env:FSPH_SVO_API = "http://127.0.0.1:$apiPort"
    $env:FSPH_SVO_ADMIN_EMAIL = $env:ADMIN_EMAIL
    $env:FSPH_SVO_PASSWORD = $env:ADMIN_PASSWORD
    $env:VITE_API_PROXY_TARGET = $env:FSPH_SVO_API
    $env:VITE_API_BASE_URL = '/api'
    $ready = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        if ($apiProcess.HasExited) { throw "API local encerrou. Consulte $runRoot/backend.log" }
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri "$env:FSPH_SVO_API/actuator/health" -TimeoutSec 2
            if ($response.StatusCode -eq 200) { $ready = $true; break }
        } catch { Start-Sleep -Seconds 1 }
    }
    if (!$ready) { throw 'API local não ficou disponível.' }
    $ErrorActionPreference = 'Continue'
    & $NodePath node_modules/@playwright/test/cli.js test --config e2e/svo-orders-local.config.ts
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
} finally {
    if ($apiProcess -and !$apiProcess.HasExited) { Stop-Process -Id $apiProcess.Id; $apiProcess.WaitForExit() }
    if ($started) { & "$PostgresBin/pg_ctl.exe" -D $dataRoot -m fast -w stop }
    foreach ($key in $savedEnvironment.Keys) { [Environment]::SetEnvironmentVariable($key, $savedEnvironment[$key], 'Process') }
    Write-Host "Artefatos: $runRoot e .deploy-validation/svo-local. Nenhum banco externo foi usado."
}
exit $exitCode
