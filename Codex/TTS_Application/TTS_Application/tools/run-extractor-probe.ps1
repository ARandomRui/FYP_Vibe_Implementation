param(
    [string]$Url,
    [switch]$Insecure,
    [string]$SaveHtml,
    [string]$InputFile,
    [switch]$Debug
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$outDir = Join-Path $scriptDir "out"
$libDir = Join-Path $scriptDir "lib"
$libJar = Join-Path $libDir "jsoup.jar"
$sourceFile = Join-Path $scriptDir "WebExtractorProbe.java"
$classFile = Join-Path $outDir "WebExtractorProbe.class"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
New-Item -ItemType Directory -Force -Path $libDir | Out-Null

if (-not (Test-Path $libJar)) {
    $cachedJar = Get-ChildItem -Path "$env:USERPROFILE\.gradle\caches\modules-2\files-2.1\org.jsoup\jsoup" -Recurse -Filter "jsoup-1.18.3.jar" |
        Select-Object -First 1 -ExpandProperty FullName

    if (-not $cachedJar) {
        throw "Couldn't find a cached jsoup jar in the local Gradle cache."
    }

    Copy-Item -LiteralPath $cachedJar -Destination $libJar -Force
}

if (-not $Url -and -not $InputFile) {
    throw "Provide either -Url or -InputFile."
}

if ($Url -and $InputFile) {
    throw "Use only one of -Url or -InputFile."
}

Remove-Item -Recurse -Force $outDir -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$stderrFile = Join-Path $outDir "javac.stderr.txt"
$compileCommand = 'javac -cp "{0}" -d "{1}" "{2}" 2>"{3}"' -f $libJar, $outDir, $sourceFile, $stderrFile
cmd /c $compileCommand | Out-Null

if (-not (Test-Path $classFile)) {
    if (Test-Path $stderrFile) {
        Get-Content $stderrFile | Write-Error
    }
    throw "Probe compilation did not produce WebExtractorProbe.class."
}

$arguments = @("-cp", "$outDir;$libJar", "WebExtractorProbe")

if ($Insecure) {
    $arguments += "--insecure"
}

if ($Debug) {
    $arguments += "--debug"
}

if ($SaveHtml) {
    $arguments += "--save-html"
    $arguments += $SaveHtml
}

if ($InputFile) {
    $arguments += "--input-file"
    $arguments += $InputFile
} else {
    $arguments += $Url
}

& java @arguments
