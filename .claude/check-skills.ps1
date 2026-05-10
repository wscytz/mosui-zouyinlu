param(
  [string]$ProjectSkillsDir = ".claude\skills",
  [string[]]$Targets = @("$HOME\.claude\skills", "$HOME\.cc-switch\skills")
)

$ErrorActionPreference = "Stop"
$failed = $false
$projectRoot = Resolve-Path -LiteralPath $ProjectSkillsDir

function Get-Sha256Hex([string]$Path) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $stream = [System.IO.File]::OpenRead((Resolve-Path -LiteralPath $Path))
    try {
      $hash = $sha.ComputeHash($stream)
      return ([System.BitConverter]::ToString($hash)).Replace("-", "")
    } finally {
      $stream.Dispose()
    }
  } finally {
    $sha.Dispose()
  }
}

$skills = Get-ChildItem -LiteralPath $projectRoot -Directory | Where-Object {
  Test-Path -LiteralPath (Join-Path $_.FullName "SKILL.md")
}

foreach ($target in $Targets) {
  Write-Output "=== Checking: $target ==="
  foreach ($skill in $skills) {
    $source = Join-Path $skill.FullName "SKILL.md"
    $targetFile = Join-Path (Join-Path $target $skill.Name) "SKILL.md"
    if (!(Test-Path -LiteralPath $targetFile)) {
      Write-Output "  MISSING: $($skill.Name)"
      $failed = $true
      continue
    }
    $sourceHash = Get-Sha256Hex $source
    $targetHash = Get-Sha256Hex $targetFile
    if ($sourceHash -eq $targetHash) {
      Write-Output "  MATCH: $($skill.Name)"
    } else {
      Write-Output "  DIFF: $($skill.Name)"
      $failed = $true
    }
  }
}

if ($failed) {
  Write-Error "Skill sync check failed. Run npm run skill:sync, then npm run skill:check."
  exit 1
}
