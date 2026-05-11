param(
  [string]$ProjectSkillsDir = ".claude\skills",
  [string[]]$Targets = @("$HOME\.claude\skills", "$HOME\.cc-switch\skills")
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path -LiteralPath $ProjectSkillsDir

$skills = Get-ChildItem -LiteralPath $projectRoot -Directory | Where-Object {
  Test-Path -LiteralPath (Join-Path $_.FullName "SKILL.md")
}

function Get-RelativePath([string]$Root, [string]$Path) {
  $rootFull = (Resolve-Path -LiteralPath $Root).Path.TrimEnd("\", "/")
  $pathFull = (Resolve-Path -LiteralPath $Path).Path
  $prefix = $rootFull + [System.IO.Path]::DirectorySeparatorChar
  if ($pathFull.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $pathFull.Substring($prefix.Length)
  }
  throw "Path is not inside root: $Path"
}

foreach ($target in $Targets) {
  if (!(Test-Path -LiteralPath $target)) {
    New-Item -ItemType Directory -Path $target | Out-Null
  }
  Write-Output "=== Syncing to: $target ==="
  foreach ($skill in $skills) {
    $targetDir = Join-Path $target $skill.Name
    if (!(Test-Path -LiteralPath $targetDir)) {
      New-Item -ItemType Directory -Path $targetDir | Out-Null
    }

    $targetSkillFile = Join-Path $targetDir "SKILL.md"
    if (Test-Path -LiteralPath $targetSkillFile) {
      $backup = $targetSkillFile + ".bak-" + (Get-Date -Format "yyyyMMdd-HHmmss")
      Copy-Item -LiteralPath $targetSkillFile -Destination $backup
      Write-Output "  Backup: $backup"
    }

    $sourceFiles = Get-ChildItem -LiteralPath $skill.FullName -File -Recurse | Where-Object {
      $_.Name -notlike "SKILL.md.bak-*"
    }

    foreach ($sourceFile in $sourceFiles) {
      $relativePath = Get-RelativePath $skill.FullName $sourceFile.FullName
      $targetFile = Join-Path $targetDir $relativePath
      $targetParent = Split-Path -Parent $targetFile
      if (!(Test-Path -LiteralPath $targetParent)) {
        New-Item -ItemType Directory -Path $targetParent | Out-Null
      }
      Copy-Item -LiteralPath $sourceFile.FullName -Destination $targetFile
    }

    Write-Output "  Installed: $($skill.Name) ($($sourceFiles.Count) files)"
  }
}
