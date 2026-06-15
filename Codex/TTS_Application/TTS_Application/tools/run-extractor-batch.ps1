param(
    [string]$UrlFile = ".\tools\test-urls.txt",
    [switch]$Insecure,
    [switch]$Debug,
    [string]$OutputDir = ".\tools\saved\batch"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$resolvedUrlFile = if ([System.IO.Path]::IsPathRooted($UrlFile)) { $UrlFile } else { Join-Path $repoRoot $UrlFile }
$resolvedOutputDir = if ([System.IO.Path]::IsPathRooted($OutputDir)) { $OutputDir } else { Join-Path $repoRoot $OutputDir }
$probeScript = Join-Path $PSScriptRoot "run-extractor-probe.ps1"

if (-not (Test-Path $resolvedUrlFile)) {
    throw "URL list not found: $resolvedUrlFile"
}

New-Item -ItemType Directory -Force -Path $resolvedOutputDir | Out-Null

$urls = Get-Content -Path $resolvedUrlFile |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ -and -not $_.StartsWith("#") }

if (-not $urls) {
    throw "No URLs found in $resolvedUrlFile"
}

$summary = New-Object System.Collections.Generic.List[string]

for ($index = 0; $index -lt $urls.Count; $index++) {
    $url = $urls[$index]
    $uri = [System.Uri]$url
    $hostSlug = ($uri.Host -replace '[^A-Za-z0-9.-]', '_')
    $pathPart = $uri.AbsolutePath.Trim('/').Split('/') | Select-Object -Last 1
    if (-not $pathPart) {
        $pathPart = "root"
    }
    $pathSlug = (($pathPart -replace '[^A-Za-z0-9._-]', '_').Trim('_'))
    if (-not $pathSlug) {
        $pathSlug = "page"
    }
    if ($pathSlug.Length -gt 24) {
        $pathSlug = $pathSlug.Substring(0, 24)
    }

    $sha1 = [System.Security.Cryptography.SHA1]::Create()
    $hashBytes = $sha1.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($url))
    $sha1.Dispose()
    $shortHash = ([System.BitConverter]::ToString($hashBytes)).Replace('-', '').Substring(0, 10).ToLowerInvariant()
    $baseName = "{0:D2}-{1}-{2}-{3}" -f ($index + 1), $hostSlug, $pathSlug, $shortHash

    $htmlPath = Join-Path $resolvedOutputDir ($baseName + ".html")
    $txtPath = Join-Path $resolvedOutputDir ($baseName + ".txt")
    $errPath = Join-Path $resolvedOutputDir ($baseName + ".error.txt")

    Write-Host "[$($index + 1)/$($urls.Count)] Testing $url"

    try {
        $arguments = @(
            "-ExecutionPolicy", "Bypass",
            "-File", $probeScript,
            "-Url", $url,
            "-SaveHtml", $htmlPath
        )

        if ($Insecure) {
            $arguments += "-Insecure"
        }
        if ($Debug) {
            $arguments += "-Debug"
        }

        $output = & powershell @arguments 2>&1
        $output | Set-Content -Path $txtPath -Encoding UTF8
        if (Test-Path $errPath) {
            Remove-Item -LiteralPath $errPath -Force
        }

        $lengthLine = $output | Where-Object { $_ -like "TEXT_LENGTH:*" } | Select-Object -First 1
        $incompleteLine = $output | Where-Object { $_ -like "LIKELY_INCOMPLETE:*" } | Select-Object -First 1
        $summary.Add("$baseName | OK | $lengthLine | $incompleteLine")
    } catch {
        $_ | Out-String | Set-Content -Path $errPath -Encoding UTF8
        $summary.Add("$baseName | ERROR | $($_.Exception.Message)")
    }
}

$summaryPath = Join-Path $resolvedOutputDir "summary.txt"
$summary | Set-Content -Path $summaryPath -Encoding UTF8

Write-Host ""
Write-Host "Saved batch outputs to: $resolvedOutputDir"
Write-Host "Summary: $summaryPath"
