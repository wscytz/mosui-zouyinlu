param(
  [string]$ProjectSkillsDir = ".claude\skills",
  [string[]]$Targets = @("$HOME\.claude\skills", "$HOME\.cc-switch\skills")
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path -LiteralPath $ProjectSkillsDir

$skills = Get-ChildItem -LiteralPath $projectRoot -Directory | Where-Object {
  Test-Path -LiteralPath (Join-Path $_.FullName "SKILL.md")
}

foreach ($target in $Targets) {
  if (!(Test-Path -LiteralPath $target)) {
    New-Item -ItemType Directory -Path $target | Out-Null
  }
  Write-Output "=== Syncing to: $target ==="
  foreach ($skill in $skills) {
    $source = Join-Path $skill.FullName "SKILL.md"
    $targetDir = Join-Path $target $skill.Name
    $targetFile = Join-Path $targetDir "SKILL.md"
    if (!(Test-Path -LiteralPath $targetDir)) {
      New-Item -ItemType Directory -Path $targetDir | Out-Null
    }
    if (Test-Path -LiteralPath $targetFile) {
      $backup = $targetFile + ".bak-" + (Get-Date -Format "yyyyMMdd-HHmmss")
      Copy-Item -LiteralPath $targetFile -Destination $backup
      Write-Output "  Backup: $backup"
    }
    Copy-Item -LiteralPath $source -Destination $targetFile
    Write-Output "  Installed: $($skill.Name)"
  }
}
