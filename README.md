# App Release Motion Video

Make a motion-graphics video for an app: a vertical release reel, a landscape USP film, or a cinematic promo with the real app on a phone in a 3D table scene

## Included skills

- `app-release-motion-video`

## Installation

```bash
npx github:AustineA/app-release-motion-video
```

This installs the skills separately at:

```text
~/.agents/skills/app-release-motion-video/
```

It then symlinks them into detected Claude Code, Codex, Cursor, Windsurf, Antigravity, Trae, and Amp installations.

Other commands:

```bash
npx github:AustineA/app-release-motion-video status
npx github:AustineA/app-release-motion-video uninstall
```

## Usage

Open your coding agent and ask:

```text
Make a cinematic promo video for <path-to-app>
```

It makes three kinds of video: a vertical release reel (10–20 s), a landscape USP film (30–60 s), and a cinematic promo (30–45 s, the real app recorded on a simulator and played on a phone in a 3D table scene).

## Requirements

- Node.js 18+, ffmpeg, Python 3 with numpy, `playwright-core` and a Chromium
- `FAL_KEY` for generated music (the synth score works without it)
- Cinematic promo only: Argent (`npx @swmansion/argent@latest init -y`) with a booted simulator, Pillow, and `ELEVENLABS_API_KEY` for foley

## Package structure

```text
bin/
  install.mjs
skill/
  app-release-motion-video/
    SKILL.md
package.json
```

## License

MIT
