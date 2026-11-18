from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets" / "hang_rong_traders"
TEMP = Path(r"C:\Users\ADMIN\AppData\Local\Temp")


def connected_background(image: Image.Image, tolerance: int) -> Image.Image:
    """Remove only the edge-connected backdrop, preserving the original meme art."""
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    seen = bytearray(width * height)
    queue = deque()

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if not seen[index]:
            seen[index] = 1
            queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(1, height - 1):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        red, green, blue, _ = pixels[x, y]
        pixels[x, y] = (red, green, blue, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if nx < 0 or ny < 0 or nx >= width or ny >= height:
                continue
            index = ny * width + nx
            if seen[index]:
                continue
            nr, ng, nb, _ = pixels[nx, ny]
            if abs(red - nr) + abs(green - ng) + abs(blue - nb) <= tolerance:
                seen[index] = 1
                queue.append((nx, ny))
    return rgba


def soft_background_key(image: Image.Image, samples: list[tuple[int, int]], tolerance: int) -> Image.Image:
    """Key a smooth cartoon backdrop from manually sampled background points.

    This is deliberately colour-only and never redraws the supplied meme.
    It complements the edge flood fill where a background has a gentle
    gradient and is broken up by caption/outline pixels.
    """
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    palette = [pixels[x, y][:3] for x, y in samples]
    for y in range(rgba.height):
        for x in range(rgba.width):
            red, green, blue, alpha = pixels[x, y]
            distance = min(abs(red - pr) + abs(green - pg) + abs(blue - pb) for pr, pg, pb in palette)
            if distance <= tolerance:
                pixels[x, y] = (red, green, blue, 0)
            elif distance < tolerance + 36:
                pixels[x, y] = (red, green, blue, int(alpha * (distance - tolerance) / 36))
    return rgba


def extract(source_name: str, output_name: str, box: tuple[int, int, int, int], tolerance: int, samples: list[tuple[int, int]]) -> None:
    source = Image.open(TEMP / source_name).convert("RGBA")
    crop = source.crop(box)
    keyed = soft_background_key(crop, samples, tolerance)
    connected_background(keyed, tolerance + 45).save(ASSETS / output_name)


def preserve_subject(source_name: str, output_name: str, box: tuple[int, int, int, int], polygon: list[tuple[int, int]]) -> None:
    """Preserve original character pixels under a hand-traced silhouette.

    The supplied memes use character colours close to their flat backgrounds,
    so automatic colour-keying erased faces and clothes. A feathered manual
    silhouette keeps the *original* pixels intact while removing everything
    outside the person (including captions/watermarks cropped out above).
    """
    original = Image.open(TEMP / source_name).convert("RGBA").crop(box)
    scale = 4
    mask = Image.new("L", (original.width * scale, original.height * scale), 0)
    ImageDraw.Draw(mask).polygon([(x * scale, y * scale) for x, y in polygon], fill=255)
    mask = mask.resize(original.size, Image.Resampling.LANCZOS)
    original.putalpha(mask)
    original.save(ASSETS / output_name)


# The crops deliberately exclude the original captions and watermark strips.
preserve_subject(
    "codex-clipboard-6e33f169-69c6-46a9-a0ab-2681e53dcaa9.png", "meme-prayer-trader-v1.png",
    (30, 85, 450, 535), [(62, 0), (340, 0), (400, 45), (405, 155), (396, 260), (416, 394), (370, 447), (170, 449), (48, 402), (18, 265), (34, 112)]
)
preserve_subject(
    "codex-clipboard-d218a7e5-1eec-4d24-ba88-bd0d3ef78181.png", "meme-bull-meditating-v1.png",
    (220, 325, 865, 1050), [(118, 0), (520, 0), (620, 88), (636, 278), (628, 518), (555, 710), (114, 710), (12, 540), (12, 280), (38, 100)]
)
preserve_subject(
    "codex-clipboard-e2761709-0c5a-469a-a3df-239192c7ef86.png", "meme-bull-monk-v1.png",
    (305, 390, 655, 760), [(15, 0), (240, 0), (330, 70), (328, 260), (286, 367), (42, 367), (0, 260), (0, 84)]
)
