Add-Type -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public class ProperTraderExtractor
{
    public static void Extract(string sheetPath, string outDir)
    {
        Directory.CreateDirectory(outDir);
        Rectangle[] rects = new Rectangle[] {
            new Rectangle(272, 10, 153, 245),
            new Rectangle(522, 20, 127, 235),
            new Rectangle(745, 25, 131, 230),
            new Rectangle(981, 25, 128, 230),
            new Rectangle(276, 256, 135, 255),
            new Rectangle(519, 256, 131, 255),
            new Rectangle(746, 256, 130, 255),
            new Rectangle(983, 256, 130, 255),
            new Rectangle(274, 512, 134, 250),
            new Rectangle(520, 512, 127, 250),
            new Rectangle(746, 512, 131, 250),
            new Rectangle(983, 512, 129, 250)
        };

        using (Bitmap srcBmp = new Bitmap(sheetPath))
        {
            BitmapData srcData = srcBmp.LockBits(new Rectangle(0, 0, srcBmp.Width, srcBmp.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            byte[] srcPixels = new byte[Math.Abs(srcData.Stride) * srcBmp.Height];
            Marshal.Copy(srcData.Scan0, srcPixels, 0, srcPixels.Length);
            srcBmp.UnlockBits(srcData);
            int stride = srcData.Stride;

            for (int i = 0; i < rects.Length; i++)
            {
                Rectangle r = rects[i];
                using (Bitmap outBmp = new Bitmap(r.Width, r.Height, PixelFormat.Format32bppArgb))
                {
                    BitmapData outData = outBmp.LockBits(new Rectangle(0, 0, r.Width, r.Height), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
                    byte[] outPixels = new byte[outData.Stride * r.Height];

                    for (int cy = 0; cy < r.Height; cy++)
                    {
                        int sy = r.Y + cy;
                        for (int cx = 0; cx < r.Width; cx++)
                        {
                            int sx = r.X + cx;
                            int srcOffset = sy * stride + sx * 4;
                            int dstOffset = cy * outData.Stride + cx * 4;

                            byte b = srcPixels[srcOffset];
                            byte g = srcPixels[srcOffset + 1];
                            byte red = srcPixels[srcOffset + 2];

                            if (red > 248 && g > 248 && b > 248)
                            {
                                outPixels[dstOffset + 3] = 0;
                            }
                            else if (red > 225 && g > 225 && b > 225)
                            {
                                double bright = red * 0.299 + g * 0.587 + b * 0.114;
                                int a = (int)(255 * (255 - bright) / 30.0);
                                if (a < 0) a = 0; if (a > 255) a = 255;
                                outPixels[dstOffset] = b;
                                outPixels[dstOffset + 1] = g;
                                outPixels[dstOffset + 2] = red;
                                outPixels[dstOffset + 3] = (byte)a;
                            }
                            else
                            {
                                outPixels[dstOffset] = b;
                                outPixels[dstOffset + 1] = g;
                                outPixels[dstOffset + 2] = red;
                                outPixels[dstOffset + 3] = 255;
                            }
                        }
                    }

                    Marshal.Copy(outPixels, 0, outData.Scan0, outPixels.Length);
                    outBmp.UnlockBits(outData);

                    string outPath = Path.Combine(outDir, "trader_" + i + ".png");
                    outBmp.Save(outPath, ImageFormat.Png);
                    Console.WriteLine("Successfully saved FULL BODY trader_" + i + ".png (" + r.Width + "x" + r.Height + ")");
                }
            }
        }
    }
}
"@ -ReferencedAssemblies System.Drawing

$src = "C:\Users\Admin\.gemini\antigravity\brain\5a284f24-820a-4f52-9264-0235e17a071b\hang_rong_characters_spritesheet_1794487407785.jpg"
$dst = "c:\Users\Admin\Desktop\LiveRepo\public\assets\hang_rong_traders"
[ProperTraderExtractor]::Extract($src, $dst)
Write-Host "EXTRACTION FINISHED 100%!"
