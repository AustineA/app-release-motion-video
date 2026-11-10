#!/usr/bin/env python3
"""Generate instrumental bed music on fal.ai, several models in parallel, so you can pick a take.

    python3 fal_music.py <out_dir> <seconds> "<prompt>" [--models eleven,stable,minimax]

Needs FAL_KEY in the environment. Writes <out_dir>/<model>.<ext> and <model>.json (the raw response).
Then run beat_grid.py on the takes and choose by tempo accuracy, structure and ending (see SKILL.md).

Model notes (2026-10):
  eleven   fal-ai/elevenlabs/music      best at following BPM + a timed structure in the prompt; tends to
                                        land a final hit and ring out a few seconds before the requested end
  stable   fal-ai/stable-audio-25/text-to-audio   accurate BPM, more ambient, up to ~190 s
  minimax  fal-ai/minimax-music/v2      punchy but caps around 35 s; prompt ≤ 300 chars
"""
import json, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

MODELS = {
    'eleven': ('fal-ai/elevenlabs/music', lambda p, s: {'prompt': p, 'music_length_ms': int(s * 1000), 'force_instrumental': True}),
    'stable': ('fal-ai/stable-audio-25/text-to-audio', lambda p, s: {'prompt': p, 'seconds_total': int(round(s))}),
    'minimax': ('fal-ai/minimax-music/v2', lambda p, s: {'prompt': p[:300], 'lyrics_prompt': '[instrumental]'}),
}


def call(url, key, data=None):
    req = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else None,
                                 headers={'Authorization': 'Key ' + key, 'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req, timeout=120))


def first_url(o):
    if isinstance(o, dict):
        if isinstance(o.get('url'), str):
            return o['url']
        o = list(o.values())
    if isinstance(o, list):
        for v in o:
            u = first_url(v)
            if u:
                return u
    return None


def run(name, out_dir, seconds, prompt, key):
    model, body = MODELS[name]
    sub = call(f'https://queue.fal.run/{model}', key, body(prompt, seconds))
    print(f'[{name}] submitted {sub.get("request_id")}', flush=True)
    t0 = time.time()
    while call(sub['status_url'], key).get('status') != 'COMPLETED':
        if time.time() - t0 > 600:
            raise TimeoutError(name)
        time.sleep(4)
    res = call(sub['response_url'], key)
    url = first_url(res)
    ext = os.path.splitext(url.split('?')[0])[1] or '.mp3'
    path = os.path.join(out_dir, name + ext)
    urllib.request.urlretrieve(url, path)
    json.dump(res, open(os.path.join(out_dir, name + '.json'), 'w'), indent=1)
    print(f'[{name}] saved {path} ({time.time() - t0:.0f}s)', flush=True)
    return path


def main():
    args = sys.argv[1:]
    if len(args) < 3:
        sys.exit(__doc__)
    out_dir, seconds, prompt = args[0], float(args[1]), args[2]
    names = args[args.index('--models') + 1].split(',') if '--models' in args else list(MODELS)
    key = os.environ.get('FAL_KEY') or sys.exit('FAL_KEY is not set')
    os.makedirs(out_dir, exist_ok=True)
    with ThreadPoolExecutor(len(names)) as ex:
        futs = {n: ex.submit(run, n, out_dir, seconds, prompt, key) for n in names}
    for n, f in futs.items():
        try:
            f.result()
        except Exception as e:  # one model failing should not lose the others
            print(f'[{n}] failed: {e}', flush=True)


if __name__ == '__main__':
    main()
