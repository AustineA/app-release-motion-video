# Generates the reel's foley on ElevenLabs (POST /v1/sound-generation), two takes of each, into sfx/.
# ONLY=tap,select limits it to those sounds (minimum length is 0.5 s).
# Key: $ELEVENLABS_API_KEY, or the path of a file holding it as the first argument. It is never printed.
import json, os, sys, urllib.request, concurrent.futures as cf

HERE = os.path.dirname(os.path.abspath(__file__))
key = os.environ.get('ELEVENLABS_API_KEY') or (open(sys.argv[1]).read().strip() if len(sys.argv) > 1 else '')
if not key.startswith('sk_'):
    sys.exit('need an ElevenLabs API key (starts with sk_)')

# name: (description, seconds, prompt influence). Each is tied to one visual in comp.js.
SFX = {
    'shutter':  ('Vintage 35mm film SLR camera: one crisp mechanical shutter click followed by the film advance lever ratcheting, close microphone, dry room, no music', 1.2, 0.7),
    'stamp':    ('A single small mechanical click of a date stamp wheel turning one notch, tiny metal tick, close and dry', 0.5, 0.6),
    'boom':     ('Deep cinematic trailer impact: a heavy low boom with sub bass punch and a long dark reverb tail, no music, no melody', 3.0, 0.6),
    'flick':    ('A thumb flicking fast through a phone photo gallery: a soft rushing swipe with a rapid flutter of tiny ticks slowing to a stop', 2.0, 0.5),
    'hush':     ('A soft breath-like reverse swell that fades into silence, airy and intimate, no tone', 2.0, 0.5),
    'riser':    ('Short cinematic riser: reverse cymbal and air swelling quickly into a hit, tense, 1.5 seconds, ends abruptly', 1.5, 0.6),
    'tap':      ('A single soft fingertip tap on a glass phone screen, very short, subtle and clean', 0.5, 0.7),
    'select':   ('A light satisfying tick of selecting a photo in an app, soft and bright, very short', 0.5, 0.6),
    'whoosh':   ('A smooth organic air whoosh passing close by, fast, cinematic, no tone, no beep', 1.0, 0.6),
    'printing': ('Glossy photo prints sliding and settling into place on a table one after another, paper slaps and soft slides, close', 2.0, 0.5),
    'send':     ('A soft airy swoosh of a story being posted, light and pleasant, with a gentle shimmer at the end', 1.2, 0.5),
    'printland': ('A single glossy photo print dropped flat onto a wooden table: one soft papery slap, close microphone, dry room, no music', 0.5, 0.6),
    'buzz':     ('A smartphone on silent vibrating once on a wooden table: one short low buzz, close microphone, dry room, no ringtone, no beep', 0.5, 0.7),
    'endhit':   ('A deep soft cinematic hit with a warm shimmering tail that rings out slowly, elegant, no melody', 4.0, 0.5),
    # the "my life in" cut (mylifein/score.py): hands, paper and glass only
    'printslide':  ('A single glossy photo print tossed onto a wooden table, sliding a short distance and stopping: soft paper friction, close microphone, dry room, no slap, no clap, no music', 0.8, 0.6),
    'pad':         ('A fingertip pad gently touching a glass phone screen once: a very soft dull muted thud, close microphone, dry, no click, no beep, no tone', 0.5, 0.7),
    'fingerslide': ('A fingertip sliding quickly up a glass phone screen: a short soft dry skin-on-glass swipe, close microphone, no whoosh, no tone', 0.6, 0.6),
    'stack':       ('One photo print placed onto a stack of photo prints: a soft papery pat with a light flutter of the edge, close microphone, dry room, no clap, no slap', 0.5, 0.6),
    'eject':       ('An instant film camera ejecting a photo: a short motor whirr and the print sliding out of the slot, close microphone, dry room, no beep, no music', 1.5, 0.6),
    # the Fatal Error cut (fatalerror/score.py): a 1990s desktop computer, and nothing that beeps
    'crton':      ('An old CRT computer monitor being switched on: one heavy plastic power button clunk, then a short soft static crackle on the glass, close microphone, dry room, no beep, no tone, no music', 1.5, 0.6),
    'hddseek':    ('A 1990s desktop computer hard disk drive working: a short dry burst of mechanical head seek chatter and clicks, close microphone, no beep, no tone, no music', 1.2, 0.6),
    'mouse':      ('One single click of a 1990s beige computer mouse button: a dry plastic micro-switch click, close microphone, dry room, no beep, no tone', 0.5, 0.7),
    'floppyin':   ('A 3.5 inch floppy disk pushed into a computer disk drive: plastic sliding in and one spring-loaded mechanical clunk, close microphone, dry room, no beep, no music', 0.8, 0.6),
    'floppyread': ('A floppy disk drive reading a disk: a steady mechanical stepper motor buzzing and grinding in short bursts, close microphone, dry room, no beep, no music', 2.0, 0.6),
    'pcoff':      ('An old desktop computer switched off: the power switch clunks, then the fan and hard disk spin down slowly to silence, close microphone, dry room, no beep, no tone, no music', 4.0, 0.6),
    'crtoff':     ('An old CRT monitor switched off: one plastic button click and a brief soft static discharge crackle fading out, close microphone, dry room, no beep, no tone', 1.0, 0.6),
    'spindown':   ('A computer hard disk drive losing power: the spinning platters wind down, a mechanical whirr falling steadily in pitch and slowing to a stop over three seconds, close microphone, dry room, no beep, no music', 3.5, 0.7),
}

def gen(name, take):
    text, secs, infl = SFX[name]
    body = json.dumps({'text': text, 'duration_seconds': secs, 'prompt_influence': infl}).encode()
    req = urllib.request.Request('https://api.elevenlabs.io/v1/sound-generation', data=body,
                                 headers={'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
    data = urllib.request.urlopen(req, timeout=120).read()
    path = os.path.join(HERE, 'sfx', f'{name}_{take}.mp3')
    open(path, 'wb').write(data)
    return path

os.makedirs(os.path.join(HERE, 'sfx'), exist_ok=True)
with cf.ThreadPoolExecutor(4) as ex:
    only = os.environ.get('ONLY', '').split(',') if os.environ.get('ONLY') else list(SFX)
    jobs = {ex.submit(gen, n, k): (n, k) for n in only for k in (1, 2)}
    for f in cf.as_completed(jobs):
        n, k = jobs[f]
        try: print('ok', os.path.basename(f.result()))
        except Exception as e: print('failed', n, k, getattr(e, 'code', ''), str(e)[:120])
