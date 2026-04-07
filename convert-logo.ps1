param(
  [Parameter(Mandatory = $true)]
  [string]$SrcPath,

  [Parameter(Mandatory = $true)]
  [string]$AssetsDir
)

Add-Type -AssemblyName System.Drawing

if (!(Test-Path $SrcPath)) {
  throw "Source image not found: $SrcPath"
}

$img = [System.Drawing.Image]::FromFile($SrcPath)
try {
  $img.Save((Join-Path $AssetsDir "favicon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $img.Save((Join-Path $AssetsDir "icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $img.Save((Join-Path $AssetsDir "splash-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  Write-Output "Converted OK: favicon.png, icon.png, splash-icon.png"
} finally {
  $img.Dispose()
}

