# wall.py <covers dir> <templates dir> <receipt frame> <out dir>
# The "scroll all templates" shot: every template's settled cover (the app's own -GrainRenderSheets output, default
# palette) as a five-column wall, scrolled bottom to top over 8 beats and baked with motion blur into 1080x1920 JPEGs.
# 61 templates; four more tiles in the dark styles fill the last row. The film pulls back out of Month Receipt into
# this wall, so its tile is the frame that clip ends on (<receipt frame>) and sits mid-screen (third row, third
# column) before the scroll starts from rest. <out dir>0.jpg is the first screen at 2.5x, for that pull-back.
import glob, json, os, sys
import numpy as np
from PIL import Image, ImageDraw

COVERS, TEMPLATES, RECEIPT, OUT = sys.argv[1:5]
W, H, COLS, TW, TH, GAP, SIDE, R = 1080, 1920, 5, 196, 348, 16, 18, 11
PITCH = TH + GAP
FRAMES, SUB = 117, 8                      # 8 beats at 30 fps (+1), samples per frame over a half-open shutter
BG = (15, 15, 16)
DARK = [('gloss', 'black', 16), ('film-strip', 'darkroom', 29), ('monthly-dump', 'black', 43), ('light-table', 'black', 58)]
HOME = 2 * COLS + 2                       # the receipt's tile

cats = {}
for f in sorted(glob.glob(os.path.join(TEMPLATES, '*.json'))):
    d = json.load(open(f))
    cats.setdefault(d['category'], []).append((d['id'], d['palettes'][0]))

# no two of a category side by side or stacked: always the fullest category that differs from the left and upper tile
order = []
while any(cats.values()):
    near = {order[i][2] for i in (len(order) - 1, len(order) - COLS) if 0 <= i < len(order)}
    if len(order) % COLS == 0 and order: near = {order[-COLS][2]}
    c = max((c for c in cats if cats[c]), key=lambda c: (c not in near, len(cats[c]), c))
    order.append((*cats[c].pop(0), c))
tiles = [(i, p) for i, p, _ in order]
for i, p, at in DARK: tiles.insert(at, (i, p))
assert len(tiles) % COLS == 0, len(tiles)
at = next(k for k, (i, _) in enumerate(tiles) if i == 'receipt')
tiles[at], tiles[HOME] = tiles[HOME], tiles[at]
rows = len(tiles) // COLS

def sheet(s, rows):                       # the wall's first `rows` rows at scale s
    px = lambda v: int(round(v * s))
    im = Image.new('RGB', (px(W), px(GAP + rows * PITCH)), BG)
    mask = Image.new('L', (px(TW) * 4, px(TH) * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, px(TW) * 4 - 1, px(TH) * 4 - 1), px(R * 4), fill=255)
    mask = mask.resize((px(TW), px(TH)), Image.LANCZOS)
    for k, (i, p) in enumerate(tiles[:rows * COLS]):
        src = RECEIPT if i == 'receipt' else os.path.join(COVERS, f'{i}-{p}-s0.png')
        tile = Image.open(src).convert('RGB').resize((px(TW), px(TH)), Image.LANCZOS)
        im.paste(tile, (px(SIDE + (k % COLS) * (TW + GAP)), px(GAP + (k // COLS) * PITCH)), mask)
    return im

sheet(2.5, 6).crop((0, 0, int(W * 2.5), int(H * 2.5))).save(OUT.rstrip('/') + '0.jpg', quality=92)
tall = np.asarray(sheet(1, rows), dtype=np.float32)
travel = tall.shape[0] - H

def pos(u):                               # from rest, and still going at the end
    u = min(max(u, 0), 1)
    return travel * (0.8 * (3 * u * u - 2 * u ** 3) + 0.2 * u * u)

os.makedirs(OUT, exist_ok=True)
for f in range(FRAMES):
    acc = np.zeros((H, W, 3), np.float32)
    for s in range(SUB):
        y = pos((f + 0.5 * s / SUB) / (FRAMES - 1))
        y0 = int(y); a = y - y0
        acc += tall[y0:y0 + H] * (1 - a) + tall[min(y0 + 1, travel):min(y0 + 1, travel) + H] * a
    Image.fromarray(np.clip(acc / SUB + 0.5, 0, 255).astype(np.uint8)).save(os.path.join(OUT, f'{f:04d}.jpg'), quality=92)
print(len(tiles), 'tiles', rows, 'rows', 'travel', travel, 'px', FRAMES, 'frames',
      'receipt tile', SIDE + (HOME % COLS) * (TW + GAP), GAP + (HOME // COLS) * PITCH, TW, TH)
