"""Builds docs/ui-directions/options.html, three static UI directions for Atlas.

Run from anywhere: python3 docs/ui-directions/build.py
Every number comes from src/data/benchmarks.json, so a rebuild picks up the latest snapshot.
"""

from pathlib import Path
from math import log10
from datetime import datetime
import base64, html, json

here = Path(__file__).resolve().parent
root = here.parents[1]
snapshot = json.loads((root / 'src/data/benchmarks.json').read_text())
esc = html.escape

LEVELS = ['low', 'medium', 'high', 'xhigh', 'max']
FAMILIES = [
    ('gpt-6-2-astra', 'GPT-6.2 Astra', 'openai', '#2c343d'),
    ('gpt-6-2-sol', 'GPT-6.2 Sol', 'openai', '#4b5868'),
    ('gpt-6-1-terra', 'GPT-6.1 Terra', 'openai', '#637184'),
    ('gpt-6-luna', 'GPT-6 Luna', 'openai', '#7e8b9c'),
    ('claude-haiku-5-5', 'Haiku 5.5', 'anthropic', '#bc7857'),
    ('claude-sonnet-5-5', 'Sonnet 5.5', 'anthropic', '#bd6948'),
    ('claude-opus-5-5', 'Opus 5.5', 'anthropic', '#ae5235'),
    ('claude-fable-5-2', 'Fable 5.2', 'anthropic', '#903e2b'),
    ('gemini-4-neon', 'Gemini 4 Neon', 'google', '#1b6e3c'),
]
OFF = ['Gemini 4 Carbon', 'Gemini 4 Hydrogen', 'Grok 4.7', 'Muse Wonder Full']


def load():
    out = []
    for fid, name, lab, color in FAMILIES:
        levels = {}
        for m in snapshot['models']:
            if m['family'] == fid and m['effort'] in LEVELS and m['intelligence'] is not None and m['cost']:
                levels[m['effort']] = {k: m[k] for k in ('intelligence', 'omniscience', 'cost', 'speed', 'time', 'tokens')}
        out.append({'id': fid, 'name': name, 'lab': lab, 'color': color,
                    'levels': [dict(level=l, **levels[l]) for l in LEVELS if l in levels]})
    return out


models = load()
by_name = {m['name']: m for m in models}
snapshot_date = datetime.fromisoformat(snapshot['fetchedAt'][:10]).strftime('%-d %b %Y')


def logo(lab, size=14):
    svg = (root / f'public/logos/{lab}.svg').read_bytes()
    invert = '' if lab == 'google' else ' class="invert"'
    return f'<img{invert} src="data:image/svg+xml;base64,{base64.b64encode(svg).decode()}" width="{size}" height="{size}" alt="">'


def cost(c):
    return f'${c:.3f}' if c < 0.1 else f'${c:.2f}' if c < 10 else f'${c:.1f}'


def minutes(s):
    return f'{s:.0f}s' if s < 60 else f'{s / 60:.1f} min'


def tokens(t):
    return f'{t / 1000:.1f}k' if t < 10000 else f'{t / 1000:.0f}k'


def level(m, name):
    return next(l for l in m['levels'] if l['level'] == name)


def frontier():
    points = sorted((l['cost'], l['intelligence'], m['name'], l['level']) for m in models for l in m['levels'])
    best, keep = -1, []
    for p in points:
        if p[1] > best:
            keep.append(p)
            best = p[1]
    return keep


FRONT = frontier()
ON_FRONT = {(p[2], p[3]) for p in FRONT}

ICONS = {
    'chevron': 'm7 10 5 5 5-5', 'search': 'M15 15l5 5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
    'moon': 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z', 'plus': 'M12 5v14M5 12h14',
    'check': 'm5 12 4 4L19 6', 'down': 'M12 5v14m-5-5 5 5 5-5', 'x': 'M6 6l12 12M18 6 6 18',
}


def icon(name, size=16):
    return (f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" aria-hidden="true" fill="none" stroke="currentColor" '
            f'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="{ICONS[name]}"/></svg>')


MARK = '<svg viewBox="0 0 26 26" width="20" height="20" aria-hidden="true"><path d="M3 21V13M10 21V8M17 21V4M24 21V10" stroke="#3456d8" stroke-width="3.6"/></svg>'


def topbar(extra=''):
    nav = ''.join(f'<span class="nav{" on" if i == 0 else ""}">{n}</span>' for i, n in enumerate(['Benchmarks', 'Efficiency', 'Changelog']))
    return f'<header class="bar"><span class="word display">{MARK}Atlas</span><nav>{nav}</nav><span class="grow"></span>{extra}<span class="iconbtn">{icon("moon")}</span></header>'


# A. Canvas ------------------------------------------------------------------

def scatter(w, h, box, labels, font=13, budget=None):
    """Cost vs intelligence. box = (x0, x1, top, bottom) in px; labels draws the right gutter."""
    x0, x1, top, bottom = box
    lo, hi = log10(0.004), log10(40)
    X = lambda c: x0 + (log10(c) - lo) / (hi - lo) * (x1 - x0)
    Y = lambda s: bottom - s / 70 * (bottom - top)
    s = [f'<svg viewBox="0 0 {w} {h}" width="{w}" height="{h}" class="plot" role="img" aria-label="Cost per task against Intelligence Index for nine models">']
    for v in range(0, 71, 10):
        s.append(f'<path d="M{x0} {Y(v):.1f}H{x1}" class="grid"/><text x="{x0 - 10}" y="{Y(v) + 4:.1f}" text-anchor="end" class="tick" font-size="{font}">{v}</text>')
    for c in [0.01, 0.03, 0.1, 0.3, 1, 3, 10, 30]:
        s.append(f'<text x="{X(c):.1f}" y="{bottom + 22}" text-anchor="middle" class="tick" font-size="{font}">${c:g}</text>')
    fp = ' '.join(f'{"M" if i == 0 else "L"}{X(p[0]):.1f} {Y(p[1]):.1f}' for i, p in enumerate(FRONT))
    s.append(f'<path d="{fp}" class="front"/>')
    for m in models:
        pts = ' '.join(f'{X(l["cost"]):.1f},{Y(l["intelligence"]):.1f}' for l in m['levels'])
        s.append(f'<polyline points="{pts}" fill="none" stroke="{m["color"]}" stroke-width="1.8" opacity=".5"/>')
        for l in m['levels']:
            on = (m['name'], l['level']) in ON_FRONT
            s.append(f'<circle cx="{X(l["cost"]):.1f}" cy="{Y(l["intelligence"]):.1f}" r="{4.6 if on else 3.6}" fill="{m["color"]}" '
                     f'stroke="#fff" stroke-width="1.6" opacity="{1 if on else .38}"/>')
    if labels:
        ends = sorted(((Y(m['levels'][-1]['intelligence']), X(m['levels'][-1]['cost']), m) for m in models), key=lambda t: t[0])
        prev = top - 30
        for py, px, m in ends:
            ly = max(py, prev + 22)
            prev = ly
            s.append(f'<path d="M{px + 6:.1f} {py:.1f}L{x1 + 14} {ly:.1f}H{x1 + 22}" stroke="{m["color"]}" fill="none" opacity=".4"/>')
            s.append(f'<text x="{x1 + 50}" y="{ly + 4.5:.1f}" fill="{m["color"]}" font-size="14" font-weight="560">{esc(m["name"])}</text>')
            s.append(f'<foreignObject x="{x1 + 28}" y="{ly - 8:.1f}" width="16" height="16">{logo(m["lab"])}</foreignObject>')
        for i, name in enumerate(OFF):
            y = bottom - 76 + i * 22
            s.append(f'<text x="{x1 + 50}" y="{y}" class="offlabel" font-size="14">+ {esc(name)}</text>')
    s.append('</svg>')
    return ''.join(s), X, Y


def mock_a():
    W, H = 1200, 660
    svg, X, Y = scatter(W, H, (70, 1000, 64, 600), True)
    sol = level(by_name['GPT-6.2 Sol'], 'high')
    px, py = X(sol['cost']), Y(sol['intelligence'])
    reasoning = ''.join(f'<span class="on">{l}</span>' for l in LEVELS)
    extra = (f'<span class="seg multi">{reasoning}</span>'
             f'<span class="switch on"><i></i>Frontier</span>'
             f'<span class="search">{icon("search", 15)}Add a model<kbd>/</kbd></span>')
    menu_items = ['Cost per task', 'Time per task', 'Tokens per task', 'Output speed', 'Release date', 'Nothing, rank by score']
    menu = ''.join(f'<li class="{"sel" if i == 0 else ""}">{icon("check", 14) if i == 0 else "<i></i>"}{t}</li>' for i, t in enumerate(menu_items))
    return f'''
<div class="mock desk" style="--w:1200px">
  {topbar(extra)}
  <div class="canvas">
    {svg}
    <span class="axisbtn y">Intelligence index{icon("chevron", 14)}</span>
    <span class="axisbtn x">Cost per task, log{icon("chevron", 14)}</span>
    <ul class="menu" style="left:770px;top:318px">{menu}</ul>
    <svg class="leader" width="1200" height="660"><path d="M{px - 6:.1f} {py - 4:.1f}L478 120" stroke="#3456d8" fill="none"/><circle cx="{px:.1f}" cy="{py:.1f}" r="8" fill="none" stroke="#3456d8" stroke-width="2"/></svg>
    <div class="pin" style="left:248px;top:76px">
      <div class="pinhead">{logo("openai")}<b>GPT-6.2 Sol</b><span>high</span><i>{icon("x", 14)}</i></div>
      <dl>
        <div><dt>Intelligence</dt><dd>{sol["intelligence"]:.1f}</dd></div>
        <div><dt>Cost per task</dt><dd>{cost(sol["cost"])}</dd></div>
        <div><dt>Output speed</dt><dd>{sol["speed"]:.0f} tok/s</dd></div>
        <div><dt>Time per task</dt><dd>{minutes(sol["time"])}</dd></div>
      </dl>
    </div>
  </div>
</div>'''


def mock_a_phone():
    svg, X, Y = scatter(390, 330, (34, 376, 14, 290), False, font=11)
    chips = ''.join(f'<span style="--c:{m["color"]}">{esc(m["name"])}</span>' for m in models)
    chips += ''.join(f'<span class="off">+ {esc(n)}</span>' for n in OFF[:2])
    sol = level(by_name['GPT-6.2 Sol'], 'high')
    return f'''
<div class="mock phone" style="--w:390px">
  <header class="bar"><span class="word display">{MARK}Atlas</span><span class="grow"></span><span class="iconbtn">{icon("search")}</span><span class="iconbtn">{icon("moon")}</span></header>
  <div class="axisrow"><span class="axisbtn">Intelligence{icon("chevron", 13)}</span><span class="vs">against</span><span class="axisbtn">Cost{icon("chevron", 13)}</span></div>
  {svg}
  <div class="chips">{chips}</div>
  <div class="sheet">
    <div class="grab"></div>
    <div class="pinhead">{logo("openai")}<b>GPT-6.2 Sol</b><span>high</span><i>{icon("x", 14)}</i></div>
    <dl class="row4">
      <div><dt>Score</dt><dd>{sol["intelligence"]:.1f}</dd></div>
      <div><dt>Cost</dt><dd>{cost(sol["cost"])}</dd></div>
      <div><dt>Speed</dt><dd>{sol["speed"]:.0f}/s</dd></div>
      <div><dt>Time</dt><dd>{minutes(sol["time"])}</dd></div>
    </dl>
  </div>
</div>'''


# B. Matrix ------------------------------------------------------------------

COLUMNS = [
    # key, title, scale (lin|log), domain, formatter, higher is better
    ('intelligence', 'Intelligence', 'lin', (0, 70), lambda v: f'{v:.1f}', True),
    ('omniscience', 'Omniscience', 'lin', (-20, 70), lambda v: f'{v:+.0f}', True),
    ('cost', 'Cost per task', 'log', (0.004, 30), cost, False),
    ('speed', 'Output speed', 'lin', (0, 260), lambda v: f'{v:.0f} tok/s', True),
    ('time', 'Time per task', 'log', (30, 3000), minutes, False),
    ('tokens', 'Tokens per task', 'log', (3000, 300000), tokens, False),
]
DOMAIN_LABELS = {'intelligence': ('0', '70'), 'omniscience': ('-20', '70'), 'cost': ('$0.004', '$30'),
                 'speed': ('0', '260'), 'time': ('30s', '50 min'), 'tokens': ('3k', '300k')}


def strip(m, col, picked, width):
    key, _, scale, (lo, hi), _, _ = col
    f = (lambda v: (log10(v) - log10(lo)) / (log10(hi) - log10(lo))) if scale == 'log' else (lambda v: (v - lo) / (hi - lo))
    X = lambda v: 4 + max(0, min(1, f(v))) * (width - 8)
    pts = [(X(l[key]), l['level']) for l in m['levels'] if l[key] is not None]
    s = [f'<svg width="{width}" height="16" aria-hidden="true"><path d="M4 8H{width - 4}" class="base"/>']
    if key == 'omniscience':
        s.append(f'<path d="M{X(0):.1f} 3V13" class="base"/>')
    s.append(f'<polyline points="{" ".join(f"{x:.1f},8" for x, _ in pts)}" stroke="{m["color"]}" stroke-width="2" opacity=".35" fill="none"/>')
    for x, l in pts:
        if l == picked:
            s.append(f'<circle cx="{x:.1f}" cy="8" r="5" fill="{m["color"]}" stroke="#fff" stroke-width="1.6"/>')
        else:
            s.append(f'<circle cx="{x:.1f}" cy="8" r="2.6" fill="{m["color"]}" opacity=".55"/>')
    s.append('</svg>')
    return ''.join(s)


def mock_b(picked='high'):
    rows = sorted(models, key=lambda m: -level(m, picked)['intelligence'])
    best = {}
    for key, _, _, _, _, up in COLUMNS:
        vals = [level(m, picked)[key] for m in models]
        best[key] = max(vals) if up else min(vals)
    head = ''.join(
        f'<div class="th{" sorted" if i == 0 else ""}"><span>{t}{icon("down", 13) if i == 0 else ""}</span>'
        f'<small><i>{DOMAIN_LABELS[k][0]}</i><i>{DOMAIN_LABELS[k][1]}</i></small></div>'
        for i, (k, t, *_r) in enumerate(COLUMNS))
    body = []
    for m in rows:
        cells = []
        for col in COLUMNS:
            v = level(m, picked)[col[0]]
            cls = ' best' if v == best[col[0]] else ''
            cells.append(f'<div class="td"><span class="val{cls}">{col[4](v)}</span>{strip(m, col, picked, 140)}</div>')
        hover = ' hover' if m['name'] == 'GPT-6.2 Sol' else ''
        body.append(f'<div class="tr{hover}"><div class="name">{logo(m["lab"])}<span style="color:{m["color"]}">{esc(m["name"])}</span></div>{"".join(cells)}</div>')
    off = ''.join(f'<span>+ {esc(n)}</span>' for n in OFF)
    seg = ''.join(f'<span class="{"on" if l == picked else ""}">{l}</span>' for l in LEVELS)
    return f'''
<div class="mock desk" style="--w:1200px">
  {topbar(f'<span class="search">{icon("search", 15)}Add a model<kbd>/</kbd></span>')}
  <div class="matrixhead">
    <h3 class="display">Frontier models at <span class="seg inline">{seg}</span> reasoning</h3>
    <span class="hint">Small dots are the other reasoning levels. Best value in each column is blue.</span>
  </div>
  <div class="matrix">
    <div class="tr thead"><div class="name"></div>{head}</div>
    {"".join(body)}
    <div class="addrow">{off}</div>
  </div>
</div>'''


def mock_b_phone(picked='high'):
    col = COLUMNS[2]
    rows = sorted(models, key=lambda m: level(m, picked)['cost'])
    tabs = ''.join(f'<span class="{"on" if c is col else ""}">{c[1]}</span>' for c in COLUMNS)
    body = ''.join(
        f'<div class="prow"><div class="name">{logo(m["lab"])}<span style="color:{m["color"]}">{esc(m["name"])}</span>'
        f'<b>{col[4](level(m, picked)[col[0]])}</b></div>{strip(m, col, picked, 342)}</div>'
        for m in rows)
    seg = ''.join(f'<span class="{"on" if l == picked else ""}">{l}</span>' for l in LEVELS)
    return f'''
<div class="mock phone" style="--w:390px">
  <header class="bar"><span class="word display">{MARK}Atlas</span><span class="grow"></span><span class="iconbtn">{icon("search")}</span><span class="iconbtn">{icon("moon")}</span></header>
  <div class="ptabs">{tabs}</div>
  <div class="pseg"><span class="seg">{seg}</span></div>
  <div class="plist">{body}</div>
</div>'''


# C. Budget (rendered by the inline script so the slider is live) -------------

def mock_c():
    return '''
<div class="mock desk" style="--w:1200px">
  TOPBAR
  <div class="budget">
    <div class="ask">
      <p class="answer display" data-answer></p>
      <p class="gap" data-gap></p>
      <label class="slider"><span>Budget per task</span><input type="range" min="0" max="1000" data-budget><output data-out></output></label>
      <div class="ranks" data-ranks></div>
    </div>
    <div class="bplot" data-plot></div>
  </div>
</div>'''.replace('TOPBAR', topbar())


def mock_c_phone():
    return f'''
<div class="mock phone" style="--w:390px">
  <header class="bar"><span class="word display">{MARK}Atlas</span><span class="grow"></span><span class="iconbtn">{icon("moon")}</span></header>
  <div class="budget compact">
    <div class="ask">
      <p class="answer display" data-answer></p>
      <p class="gap" data-gap></p>
      <label class="slider"><span>Budget per task</span><input type="range" min="0" max="1000" data-budget><output data-out></output></label>
      <div class="ranks" data-ranks></div>
    </div>
  </div>
</div>'''


font = base64.b64encode((root / 'src/assets/dm-sans.woff2').read_bytes()).decode()
logos = {lab: logo(lab) for lab in ('openai', 'anthropic', 'google')}
page = (here / 'template.html').read_text()
for key, value in {
    'FONT': font, 'SNAPSHOT': snapshot_date,
    'MOCK_A': mock_a(), 'MOCK_A_PHONE': mock_a_phone(),
    'MOCK_B': mock_b(), 'MOCK_B_PHONE': mock_b_phone(),
    'MOCK_C': mock_c(), 'MOCK_C_PHONE': mock_c_phone(),
    'DATA': json.dumps({'models': models, 'logos': logos}),
}.items():
    page = page.replace('{{' + key + '}}', value)
(here / 'options.html').write_text(page)
print(f'wrote {here / "options.html"} ({len(page) // 1024} KiB)')
