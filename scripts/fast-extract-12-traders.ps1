Add-Type -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public class FastSpriteExtractor
{
    public static void Extract12(string sheetPath, string outDir)
    {
        Directory.CreateDirectory(outDir);
        using (Bitmap bmp = new Bitmap(sheetPath))
        {
            int w = bmp.Width;
            int h = bmp.Height;
            int cols = 4;
            int rows = 3;
            int cellW = w / cols;
            int cellH = h / rows;

            BitmapData srcData = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            int byteCount = Math.Abs(srcData.Stride) * h;
            byte[] pixels = new byte[byteCount];
            Marshal.Copy(srcData.Scan0, pixels, 0, byteCount);
            bmp.UnlockBits(srcData);

            int stride = srcData.Stride;

            for (int r = 0; r < rows; r++)
            {
                for (int c = 0; c < cols; c++)
                {
                    int idx = r * cols + c;
                    int startX = c * cellW;
                    int endX = (c + 1) * cellW - 1;
                    int startY = r * cellH;
                    int endY = (r + 1) * cellH - 1;

                    int minX = endX, maxX = startX, minY = endY, maxY = startY;

                    for (int y = startY; y <= endY; y++)
                    {
                        for (int x = startX; x <= endX; x++)
                        {
                            int offset = y * stride + x * 4;
                            byte b = pixels[offset];
                            byte g = pixels[offset + 1];
                            byte red = pixels[offset + 2];

                            if (red < 242 || g < 242 || b < 242)
                            {
                                if (x < minX) minX = x;
                                if (x > maxX) maxX = x;
                                if (y < minY) minY = y;
                                if (y > maxY) maxY = y;
                            }
                        }
                    }

                    int charW = maxX - minX + 1;
                    int charH = maxY - minY + 1;

                    if (charW > 10 && charH > 10)
                    {
                        using (Bitmap charBmp = new Bitmap(charW, charH, PixelFormat.Format32bppArgb))
                        {
                            BitmapData charData = charBmp.LockBits(new Rectangle(0, 0, charW, charH), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
                            byte[] charPixels = new byte[charData.Stride * charH];

                            for (int cy = 0; cy < charH; cy++)
                            {
                                int sy = minY + cy;
                                for (int cx = 0; cx < charW; cx++)
                                {
                                    int sx = minX + cx;
                                    int srcOffset = sy * stride + sx * 4;
                                    int dstOffset = cy * charData.Stride + cx * 4;

                                    byte b = pixels[srcOffset];
                                    byte g = pixels[srcOffset + 1];
                                    byte red = pixels[srcOffset + 2];

                                    if (red > 248 && g > 248 && b > 248)
                                    {
                                        charPixels[dstOffset + 3] = 0; // Alpha = 0
                                    }
                                    else if (red > 230 && g > 230 && b > 230)
                                    {
                                        double bright = red * 0.299 + g * 0.587 + b * 0.114;
                                        int a = (int)(255 * (255 - bright) / 25);
                                        if (a < 0) a = 0; if (a > 255) a = 255;
                                        charPixels[dstOffset] = b;
                                        charPixels[dstOffset + 1] = g;
                                        charPixels[dstOffset + 2] = red;
                                        charPixels[dstOffset + 3] = (byte)a;
                                    }
                                    else
                                    {
                                        charPixels[dstOffset] = b;
                                        charPixels[dstOffset + 1] = g;
                                        charPixels[dstOffset + 2] = red;
                                        charPixels[dstOffset + 3] = 255;
                                    }
                                }
                            }

                            Marshal.Copy(charPixels, 0, charData.Scan0, charPixels.Length);
                            charBmp.UnlockBits(charData);

                            string outPath = Path.Combine(outDir, "trader_" + idx + ".png");
                            charBmp.Save(outPath, ImageFormat.Png);
                            Console.WriteLine("Fast Extracted Trader " + idx + " to " + outPath + " (" + charW + "x" + charH + ")");
                        }
                    }
                }
            }
        }
    }
}
"@ -ReferencedAssemblies System.Drawing

$sheet12Source = "C:\Users\Admin\.gemini\antigravity\brain\5a284f24-820a-4f52-9264-0235e17a071b\hang_rong_characters_spritesheet_1794487407785.jpg"
$outDir = "c:\Users\Admin\Desktop\LiveRepo\public\assets\hang_rong_traders"

[FastSpriteExtractor]::Extract12($sheet12Source, $outDir)
Write-Host "FAST EXTRACTION COMPLETED 100%!"
