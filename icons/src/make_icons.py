"""Tildoc 앱 아이콘 생성기. 둥근 사각 타일 위에 흰 물결(~, Segoe UI Semibold 글자)을 얹어 색별 아이콘을 만든다.

    python icons/src/make_icons.py

출력 (repo 루트 기준):
  icons/<색>.ico     설정 메뉴의 아이콘 색 12종 (Form1.IconColors와 이름이 같아야 한다)
  icon.ico           exe에 박히는 기본 아이콘 (= DEFAULT)
  icon-preview.png   기본 아이콘 미리보기
필요: Pillow, numpy
"""
import io, os, struct
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
DEFAULT = "ocean"
# 이름: (그라데이션 시작색, 끝색). 좌상단 -> 우하단
COLORS = {
    "blue":     ((40,130,255),  (30,70,220)),
    "sky":      ((40,190,255),  (20,120,230)),
    "teal":     ((20,200,180),  (10,130,150)),
    "green":    ((60,205,110),  (20,150,90)),
    "lime":     ((150,215,40),  (60,170,50)),
    "amber":    ((255,190,40),  (245,130,20)),
    "orange":   ((255,140,60),  (240,80,40)),
    "coral":    ((255,110,100), (225,60,90)),
    "pink":     ((255,100,170), (210,50,150)),
    "navy":     ((55,75,140),   (25,35,80)),
    "graphite": ((80,84,96),    (30,32,40)),
    "ocean":    ((60,140,255),  (40,200,190)),
}
S = 1024  # 작업 해상도

TILDE_FONT = "C:/Windows/Fonts/seguisb.ttf"  # Segoe UI Semibold (Windows 기본 글꼴)

def wave_mask(size, width):
    """size x size 마스크 가운데에 Segoe UI Semibold의 '~' 글자. width: 타일 대비 물결 폭"""
    big = Image.new("L", (size*4, size*4), 0)
    ImageDraw.Draw(big).text((0, 0), "~", font=ImageFont.truetype(TILDE_FONT, size*4), fill=255)
    g = big.crop(big.getbbox())
    w = int(size*width)
    g = g.resize((w, round(g.height*w/g.width)), Image.LANCZOS)
    m = Image.new("L", (size, size), 0)
    m.paste(g, ((size-g.width)//2, (size-g.height)//2))
    return m

def squircle(size, r=0.225):
    m = Image.new("L", (size*4, size*4), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, size*4-1, size*4-1), radius=int(size*4*r), fill=255)
    return m.resize((size, size), Image.LANCZOS)

def gradient(size, c1, c2):
    y, x = np.mgrid[0:size, 0:size] / (size-1)
    t = (x*0.35 + y*0.65)[..., None]
    return Image.fromarray((np.array(c1)*(1-t) + np.array(c2)*t).astype(np.uint8), "RGB")

def highlight(size):
    # 좌상단의 은은한 흰 빛
    y, x = np.mgrid[0:size, 0:size] / (size-1)
    a = np.clip(1 - np.sqrt((x-0.2)**2 + (y-0.1)**2) / 0.9, 0, 1)**2 * 0.28
    im = Image.new("RGBA", (size, size), (255, 255, 255, 0))
    im.putalpha(Image.fromarray((a*255).astype(np.uint8)))
    return im

def render(c1, c2, inset, gscale, shadow):
    """inset: 가장자리 여백 비율, gscale: 타일 대비 물결 폭, shadow: 바닥 그림자 여부"""
    inner = int(S*(1-2*inset))
    off = int(S*inset)
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    if shadow:
        sh = Image.new("L", (S, S), 0)
        sh.paste(squircle(inner), (off, off + int(S*0.018)))
        sh = sh.filter(ImageFilter.GaussianBlur(S*0.02)).point(lambda v: int(v*0.35))
        out.paste((0, 0, 0, 255), (0, 0, S, S), sh)
    tile = Image.alpha_composite(gradient(inner, c1, c2).convert("RGBA"), highlight(inner))
    gm = wave_mask(inner, gscale)
    gs = Image.new("L", (inner, inner), 0)
    gs.paste(gm, (0, int(inner*0.012)))
    gs = gs.filter(ImageFilter.GaussianBlur(inner*0.012)).point(lambda v: int(v*0.28))
    tile.paste((0, 0, 0, 255), (0, 0, inner, inner), gs)
    tile.paste((255, 255, 255, 255), (0, 0, inner, inner), gm)
    clipped = Image.new("RGBA", (inner, inner), (0, 0, 0, 0))
    clipped.paste(tile, (0, 0), squircle(inner))
    out.alpha_composite(clipped, (off, off))
    return out

def dib(im):
    # 32비트 BGRA DIB(아래->위) + 1비트 AND 마스크. 48px 이하는 이 형식이어야 옛 API(GDI+)도 읽는다
    s = im.width
    bgra = np.array(im)[::-1][..., [2, 1, 0, 3]].tobytes()
    mask = b"\0" * (((s + 31)//32)*4 * s)
    return struct.pack("<IiiHHIIiiII", 40, s, s*2, 1, 32, 0, len(bgra)+len(mask), 0, 0, 0, 0) + bgra + mask

def write_ico(path, big, small):
    sizes = [16, 20, 24, 32, 40, 48, 64, 128, 256]
    blobs = []
    for s in sizes:
        im = (small if s <= 32 else big).resize((s, s), Image.LANCZOS)
        if s <= 48:
            blobs.append(dib(im))
        else:
            b = io.BytesIO(); im.save(b, "PNG", optimize=True); blobs.append(b.getvalue())
    out = io.BytesIO()
    out.write(struct.pack("<HHH", 0, 1, len(sizes)))
    pos = 6 + 16*len(sizes)
    for s, b in zip(sizes, blobs):
        out.write(struct.pack("<BBBBHHII", s % 256, s % 256, 0, 0, 1, 32, len(b), pos)); pos += len(b)
    for b in blobs: out.write(b)
    with open(path, "wb") as f: f.write(out.getvalue())

def main():
    os.makedirs(os.path.join(ROOT, "icons"), exist_ok=True)
    for name, (c1, c2) in COLORS.items():
        big = render(c1, c2, inset=0.08, gscale=0.47, shadow=True)    # 40px 이상
        small = render(c1, c2, inset=0.02, gscale=0.72, shadow=False)  # 32px 이하: 여백 줄이고 물결 키움
        write_ico(os.path.join(ROOT, "icons", f"{name}.ico"), big, small)
        if name == DEFAULT:
            write_ico(os.path.join(ROOT, "icon.ico"), big, small)
            pv = Image.new("RGBA", (416, 256), (0, 0, 0, 0))
            x = 0
            for s in (256, 64, 32, 16):
                pv.alpha_composite((small if s <= 32 else big).resize((s, s), Image.LANCZOS), (x, 256-s))
                x += s + 16
            pv.save(os.path.join(ROOT, "icon-preview.png"))
        print(name)

if __name__ == "__main__":
    main()
