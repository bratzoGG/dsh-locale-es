<#
.SYNOPSIS
    Instala el paquete de idioma español (dsh-locale-es) en un perfil de DeepSeek Harness.

.DESCRIPTION
    Copia el paquete al perfil, lo declara como dependencia y añade la fila del
    cargador en cordis.patch.yml como lista `insert`. Todo archivo que se modifica
    se respalda antes con el sufijo .bak-locale-es-<timestamp>.

.PARAMETER Profile
    Nombre del perfil. Por defecto: desktop.

.PARAMETER DshHome
    Directorio de datos de DSH. Por defecto: $env:DSH_HOME o %USERPROFILE%\.dsh.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\install.ps1
#>
[CmdletBinding()]
param(
    [string]$Profile = 'desktop',
    [string]$DshHome
)

$ErrorActionPreference = 'Stop'

function Write-Utf8NoBom {
    param([string]$Path, [string]$Text)
    $enc = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Text, $enc)
}

function Backup-File {
    param([string]$Path)
    $stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $dest = "$Path.bak-locale-es-$stamp"
    Copy-Item -LiteralPath $Path -Destination $dest -Force
    return $dest
}

if (-not $DshHome) {
    $DshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
}

$profileDir = Join-Path $DshHome "profiles\$Profile"
if (-not (Test-Path -LiteralPath $profileDir)) {
    throw "No existe el perfil '$Profile' en $profileDir. Abre DeepSeek Harness al menos una vez o indica el perfil con -Profile."
}

$packageName = 'dsh-locale-es'
$source = $PSScriptRoot
foreach ($required in @('lib\client.js', 'lib\index.js', 'cordis.patch.yml', 'package.json')) {
    if (-not (Test-Path -LiteralPath (Join-Path $source $required))) {
        throw "No encuentro '$required' en $source. Ejecuta el instalador desde la carpeta que contiene lib\, cordis.patch.yml y package.json."
    }
}

$pluginDir = Join-Path $profileDir "plugins\$packageName"
$moduleDir = Join-Path $profileDir "node_modules\$packageName"

Write-Host "Instalando $packageName en $profileDir" -ForegroundColor Cyan

# 1. copiar solo los archivos del paquete (no scripts/, translations/ ni los .ps1)
foreach ($target in @($pluginDir, $moduleDir)) {
    if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
    New-Item -ItemType Directory -Force -Path $target | Out-Null
    Copy-Item -Path (Join-Path $source 'lib') -Destination (Join-Path $target 'lib') -Recurse -Force
    Copy-Item -LiteralPath (Join-Path $source 'cordis.patch.yml') -Destination $target -Force
    Copy-Item -LiteralPath (Join-Path $source 'package.json') -Destination $target -Force
}
Write-Host "  archivos copiados: plugins\$packageName y node_modules\$packageName"

# 2. declarar la dependencia en package.json del perfil
$manifestPath = Join-Path $profileDir 'package.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if (-not $manifest.PSObject.Properties['dependencies']) {
    $manifest | Add-Member -MemberType NoteProperty -Name dependencies -Value (New-Object psobject)
}
$spec = "link:./plugins/$packageName"
$current = if ($manifest.dependencies.PSObject.Properties[$packageName]) { $manifest.dependencies.$packageName } else { $null }
if ($current -eq $spec) {
    Write-Host '  package.json ya declara el paquete'
} else {
    $backup = Backup-File -Path $manifestPath
    Write-Host "  respaldo: $(Split-Path -Leaf $backup)"
    $manifest.dependencies | Add-Member -MemberType NoteProperty -Name $packageName -Value $spec -Force
    Write-Utf8NoBom -Path $manifestPath -Text ($manifest | ConvertTo-Json -Depth 32)
    $null = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    Write-Host '  package.json actualizado'
}

# 3. añadir la fila del cargador como lista `insert`
$patchPath = Join-Path $profileDir 'cordis.patch.yml'
$patch = Get-Content -LiteralPath $patchPath -Raw
$row = "- insert:`n    - id: locale-es`n      name: '$packageName'"

if ($patch -match [regex]::Escape($packageName)) {
    Write-Host '  cordis.patch.yml ya referencia el paquete'
} else {
    $backup = Backup-File -Path $patchPath
    Write-Host "  respaldo: $(Split-Path -Leaf $backup)"
    $trimmed = $patch.TrimEnd() + "`n" + $row + "`n"
    Write-Utf8NoBom -Path $patchPath -Text $trimmed
    Write-Host '  fila del cargador añadida'
}

Write-Host ''
Write-Host 'Listo.' -ForegroundColor Green
Write-Host '  1. Cierra y vuelve a abrir DeepSeek Harness.'
Write-Host '  2. Ajustes -> General -> Language -> Español.'
Write-Host ''
Write-Host 'Para revertir: powershell -ExecutionPolicy Bypass -File .\uninstall.ps1'
