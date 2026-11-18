Add-Type -AssemblyName System.Drawing

$bgSource = "C:\Users\Admin\.gemini\antigravity\brain\5a284f24-820a-4f52-9264-0235e17a071b\hang_rong_street_trading_floor_png_1794487400504.jpg"
$sheet12Source = "C:\Users\Admin\.gemini\antigravity\brain\5a284f24-820a-4f52-9264-0235e17a071b\hang_rong_characters_spritesheet_1794487407785.jpg"

$targetBg = "c:\Users\Admin\Desktop\LiveRepo\public\assets\wooden-temple-v1\background.png"
$hangRongBg = "c:\Users\Admin\Desktop\LiveRepo\public\assets\hang_rong_floor.png"

# 1. Resize and save background (941 x 1672)
Write-Host "1. Processing new clean background..."
$srcBgImg = [System.Drawing.Image]::FromFile($bgSource)
$destBg = New-Object System.Drawing.Bitmap 941, 1672
$gBg = [System.Drawing.Graphics]::FromImage($destBg)
$gBg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gBg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gBg.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gBg.DrawImage($srcBgImg, 0, 0, 941, 1672)
$gBg.Dispose()
$srcBgImg.Dispose()

$destBg.Save($hangRongBg, [System.Drawing.Imaging.ImageFormat]::Png)
$destBg.Save($targetBg, [System.Drawing.Imaging.ImageFormat]::Png)
$destBg.Dispose()
Write-Host "Saved clean background to $targetBg and $hangRongBg"

# 2. Extract 12 characters from 4x3 grid
Write-Host "2. Extracting 12 characters from spritesheet..."
$outDir = "c:\Users\Admin\Desktop\LiveRepo\public\assets\hang_rong_traders"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$bmp = New-Object System.Drawing.Bitmap($sheet12Source)
$w = $bmp.Width
$h = $bmp.Height
Write-Host "Spritesheet size: $w x $h"

$cols = 4
$rows = 3
$cellW = $w / $cols
$cellH = $h / $rows

for ($r = 0; $r -lt $rows; $r++) {
    for ($c = 0; $c -lt $cols; $c++) {
        $idx = $r * $cols + $c
        $startX = [int]($c * $cellW)
        $endX = [int](($c + 1) * $cellW - 1)
        $startY = [int]($r * $cellH)
        $endY = [int](($r + 1) * $cellH - 1)

        # Find tight bounding box of character inside this cell
        $bMinX = $endX; $bMaxX = $startX; $bMinY = $endY; $bMaxY = $startY
        for ($x = $startX; $x -le $endX; $x++) {
            for ($y = $startY; $y -le $endY; $y++) {
                $pixel = $bmp.GetPixel($x, $y)
                if ($pixel.R -lt 245 -or $pixel.G -lt 245 -or $pixel.B -lt 245) {
                    if ($x -lt $bMinX) { $bMinX = $x }
                    if ($x -gt $bMaxX) { $bMaxX = $x }
                    if ($y -lt $bMinY) { $bMinY = $y }
                    if ($y -gt $bMaxY) { $bMaxY = $y }
                }
            }
        }

        $charW = $bMaxX - $bMinX + 1
        $charH = $bMaxY - $bMinY + 1

        if ($charW -gt 10 -and $charH -gt 10) {
            $charBmp = New-Object System.Drawing.Bitmap($charW, $charH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
            for ($cx = 0; $cx -lt $charW; $cx++) {
                for ($cy = 0; $cy -lt $charH; $cy++) {
                    $srcC = $bmp.GetPixel($bMinX + $cx, $bMinY + $cy)
                    $brightness = ($srcC.R * 0.299 + $srcC.G * 0.587 + $srcC.B * 0.114)
                    if ($srcC.R -gt 248 -and $srcC.G -gt 248 -and $srcC.B -gt 248) {
                        $charBmp.SetPixel($cx, $cy, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
                    } elseif ($srcC.R -gt 230 -and $srcC.G -gt 230 -and $srcC.B -gt 230) {
                        $alpha = [int](255 * (255 - $brightness) / 25)
                        if ($alpha -lt 0) { $alpha = 0 }
                        if ($alpha -gt 255) { $alpha = 255 }
                        $charBmp.SetPixel($cx, $cy, [System.Drawing.Color]::FromArgb($alpha, $srcC.R, $srcC.G, $srcC.B))
                    } else {
                        $charBmp.SetPixel($cx, $cy, [System.Drawing.Color]::FromArgb(255, $srcC.R, $srcC.G, $srcC.B))
                    }
                }
            }
            $outPath = Join-Path $outDir "trader_$idx.png"
            $charBmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
            $charBmp.Dispose()
            Write-Host "Saved Trader $idx to $outPath ($charW x $charH)"
        }
    }
}

$bmp.Dispose()
Write-Host "Completed 12 traders extraction!"
