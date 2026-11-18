Add-Type -AssemblyName System.Drawing

$destPath = "c:\Users\Admin\Desktop\LiveRepo\public\assets\wooden-temple-v1\devotee-sheet.png"
$destCopy = "c:\Users\Admin\Desktop\LiveRepo\public\assets\hang_rong_sheet.png"

$charFiles = @(
    "c:\Users\Admin\Desktop\LiveRepo\public\assets\hang_rong_char_0.png",
    "c:\Users\Admin\Desktop\LiveRepo\public\assets\hang_rong_char_1.png",
    "c:\Users\Admin\Desktop\LiveRepo\public\assets\hang_rong_char_2.png",
    "c:\Users\Admin\Desktop\LiveRepo\public\assets\hang_rong_char_3.png"
)

$chars = @()
foreach ($f in $charFiles) {
    $chars += [System.Drawing.Image]::FromFile($f)
}

# 1254 x 1254 32bpp ARGB bitmap
$sheet = New-Object System.Drawing.Bitmap(1254, 1254, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($sheet)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))

$cellW = 1254.0 / 4.0 # 313.5
$cellH = 1254.0 / 2.0 # 627.0

# Mapping poses to characters:
# Pose 0: char 0 (idle)
# Pose 1: char 3 (phone)
# Pose 2: char 1 (fist pump)
# Pose 3: char 0 (main idle seated)
# Pose 4: char 3 (phone check)
# Pose 5: char 1 (fist pump)
# Pose 6: char 2 (cheering two arms)
# Pose 7: char 1 (celebration)
$poseCharMap = @(0, 3, 1, 0, 3, 1, 2, 1)

# Ground Y relative to cell top: 595
$targetGroundY = 595.0
# Target character height in cell: ~460px
$targetCharH = 460.0

for ($pose = 0; $pose -lt 8; $pose++) {
    $col = $pose % 4
    $row = [Math]::Floor($pose / 4)
    $cellX = $col * $cellW
    $cellY = $row * $cellH
    
    $cIdx = $poseCharMap[$pose]
    $srcImg = $chars[$cIdx]
    
    $aspect = [double]$srcImg.Width / [double]$srcImg.Height
    $drawH = $targetCharH
    $drawW = $targetCharH * $aspect
    
    # Center horizontally in cell (cell center = cellX + cellW/2)
    $drawX = $cellX + ($cellW - $drawW) / 2.0
    # Bottom touches ground
    $drawY = $cellY + ($targetGroundY - $drawH)
    
    $g.DrawImage($srcImg, [float]$drawX, [float]$drawY, [float]$drawW, [float]$drawH)
    Write-Host "Pose $pose placed (col=$col, row=$row) at X=$drawX, Y=$drawY, W=$drawW, H=$drawH"
}

$g.Dispose()

foreach ($c in $chars) {
    $c.Dispose()
}

$sheet.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
$sheet.Save($destCopy, [System.Drawing.Imaging.ImageFormat]::Png)
$sheet.Dispose()

Write-Host "Successfully generated 1254x1254 Hàng Rong devotee-sheet.png!"
