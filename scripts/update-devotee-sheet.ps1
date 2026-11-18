Add-Type -AssemblyName System.Drawing

$destPath = "c:\Users\Admin\Desktop\LiveRepo\public\assets\wooden-temple-v1\devotee-sheet.png"
$traderDir = "c:\Users\Admin\Desktop\LiveRepo\public\assets\hang_rong_traders"

$sheet = New-Object System.Drawing.Bitmap(1254, 1254, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($sheet)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))

$cellW = 1254.0 / 4.0 # 313.5
$cellH = 1254.0 / 2.0 # 627.0
$targetCharH = 460.0
$targetGroundY = 595.0

# Populate 8 poses from distinct traders:
$traderIdxMap = @(0, 1, 2, 3, 4, 5, 6, 7)

for ($pose = 0; $pose -lt 8; $pose++) {
    $col = $pose % 4
    $row = [Math]::Floor($pose / 4)
    $cellX = $col * $cellW
    $cellY = $row * $cellH
    
    $tId = $traderIdxMap[$pose]
    $tPath = Join-Path $traderDir "trader_$tId.png"
    if (Test-Path $tPath) {
        $srcImg = [System.Drawing.Image]::FromFile($tPath)
        $aspect = [double]$srcImg.Width / [double]$srcImg.Height
        $drawH = $targetCharH
        $drawW = $targetCharH * $aspect
        $drawX = $cellX + ($cellW - $drawW) / 2.0
        $drawY = $cellY + ($targetGroundY - $drawH)
        
        $g.DrawImage($srcImg, [float]$drawX, [float]$drawY, [float]$drawW, [float]$drawH)
        $srcImg.Dispose()
    }
}

$g.Dispose()
$sheet.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
$sheet.Dispose()

Write-Host "Re-generated devotee-sheet.png with distinct Game Hàng Rong characters!"
