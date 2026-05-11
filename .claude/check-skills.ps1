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

function Get-RelativePath([string]$Root, [string]$Path) {
  $rootFull = (Resolve-Path -LiteralPath $Root).Path.TrimEnd("\", "/")
  $pathFull = (Resolve-Path -LiteralPath $Path).Path
  $prefix = $rootFull + [System.IO.Path]::DirectorySeparatorChar
  if ($pathFull.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $pathFull.Substring($prefix.Length)
  }
  throw "Path is not inside root: $Path"
}

$skills = Get-ChildItem -LiteralPath $projectRoot -Directory | Where-Object {
  Test-Path -LiteralPath (Join-Path $_.FullName "SKILL.md")
}

foreach ($target in $Targets) {
  Write-Output "=== Checking: $target ==="
  foreach ($skill in $skills) {
    $targetSkillDir = Join-Path $target $skill.Name
    if (!(Test-Path -LiteralPath $targetSkillDir)) {
      Write-Output "  MISSING: $($skill.Name)"
      $failed = $true
      continue
    }

    $sourceFiles = Get-ChildItem -LiteralPath $skill.FullName -File -Recurse | Where-Object {
      $_.Name -notlike "SKILL.md.bak-*"
    }
    $skillFailed = $false

    foreach ($sourceFile in $sourceFiles) {
      $relativePath = Get-RelativePath $skill.FullName $sourceFile.FullName
      $targetFile = Join-Path $targetSkillDir $relativePath
      if (!(Test-Path -LiteralPath $targetFile)) {
        Write-Output "  MISSING: $($skill.Name)/$relativePath"
        $failed = $true
        $skillFailed = $true
        continue
      }

      $sourceHash = Get-Sha256Hex $sourceFile.FullName
      $targetHash = Get-Sha256Hex $targetFile
      if ($sourceHash -ne $targetHash) {
        Write-Output "  DIFF: $($skill.Name)/$relativePath"
        $failed = $true
        $skillFailed = $true
      }
    }

    if (!$skillFailed) {
      Write-Output "  MATCH: $($skill.Name) ($($sourceFiles.Count) files)"
    }
  }
}

if ($failed) {
  Write-Error "Skill sync check failed. Run npm run skill:sync, then npm run skill:check."
  exit 1
}
