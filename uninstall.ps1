<#
.SYNOPSIS
    Desinstala el paquete de idioma español (dsh-locale-es) de un perfil de DeepSeek Harness.

.DESCRIPTION
    Restaura cordis.patch.yml y package.json desde el respaldo .bak-locale-es-*
    más reciente (o, si no hay respaldo, elimina solo lo que añadió el instalador)
    y borra los archivos del paquete.

.PARAMETER Profile
    Nombre del perfil. Por defecto: desktop.

.PARAMETER DshHome
    Directorio de datos de DSH. Por defecto: $env:DSH_HOME o %USERPROFILE%\.dsh.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\uninstall.ps1
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

function Restore-LatestBackup {
    param([string]$Path)
    $dir = Split-Path -Parent $Path
    $leaf = Split-Path -Leaf $Path
    $backups = Get-ChildItem -LiteralPath $dir -Filter "$leaf.bak-locale-es-*" -ErrorAction SilentlyContinue |
        Sort-Object Name
    if ($backups) {
        $latest = $backups[-1]
        Copy-Item -LiteralPath $latest.FullName -Destination $Path -Force
        return $latest.Name
    }
    return $null
}

if (-not $DshHome) {
    $DshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
}

$profileDir = Join-Path $DshHome "profiles\$Profile"
if (-not (Test-Path -LiteralPath $profileDir)) { throw "No existe el perfil '$Profile' en $profileDir." }

$packageName = 'dsh-locale-es'
Write-Host "Desinstalando $packageName de $profileDir" -ForegroundColor Cyan

foreach ($name in @('cordis.patch.yml', 'package.json')) {
    $path = Join-Path $profileDir $name
    $restored = Restore-LatestBackup -Path $path
    if ($restored) {
        Write-Host "  $name restaurado desde $restored"
    } elseif ($name -eq 'cordis.patch.yml') {
        $text = Get-Content -LiteralPath $path -Raw
        $pattern = "(?s)\r?\n- insert:\r?\n\s+- id: locale-es\r?\n\s+name: '$([regex]::Escape($packageName))'\r?\n?"
        $next = [regex]::Replace($text, $pattern, "`n")
        if ($next -ne $text) {
            Write-Utf8NoBom -Path $path -Text $next
            Write-Host '  fila del cargador eliminada'
        }
    } elseif ($name -eq 'package.json') {
        $manifest = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
        if ($manifest.PSObject.Properties['dependencies'] -and $manifest.dependencies.PSObject.Properties[$packageName]) {
            $manifest.dependencies.PSObject.Properties.Remove($packageName)
            Write-Utf8NoBom -Path $path -Text ($manifest | ConvertTo-Json -Depth 32)
            Write-Host '  dependencia eliminada de package.json'
        }
    }
}

foreach ($target in @((Join-Path $profileDir "plugins\$packageName"), (Join-Path $profileDir "node_modules\$packageName"))) {
    if (Test-Path -LiteralPath $target) {
        Remove-Item -LiteralPath $target -Recurse -Force
        Write-Host "  eliminado: $target"
    }
}

Write-Host ''
Write-Host 'Listo. Reinicia DeepSeek Harness.' -ForegroundColor Green
