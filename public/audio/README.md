# Section audio

Drop one file here per track. The site picks them up automatically — no code
change needed, as long as the filenames match.

| Track | Section | Expected file |
|---|---|---|
| 1 | About Me | `about.mp3` |
| 2 | Hold'em Bot | `holdem-bot.mp3` |
| 3 | Learning Tool MCP | `learning-tool-mcp.mp3` |
| 4 | EntryID Platform (Amazon 2026) | `amazon-2026.mp3` |
| 5 | Network Health Service (Amazon 2025) | `amazon-2025.mp3` |
| 6 | Gateway & Bedrock (Amazon 2024) | `amazon-2024.mp3` |
| 7 | Let's Connect | `contact.mp3` |

The mapping lives in `TRACKS` in `src/App.tsx` (the `audio` field) if you want
different filenames.

## Notes

- **Missing files are fine.** A file that isn't here fails to load and the
  player falls back to its scroll-driven behaviour for that track. Partial
  coverage works: add two files now and five later.
- **Only publish audio you have the right to distribute.** This repo is public
  and GitHub Pages serves these files to anyone, so anything here is being
  distributed. Your own recordings are fine; commercial tracks are not.
- **Keep files small.** 128 kbps mono is plenty for background audio, roughly
  1 MB per minute. Short clips beat full songs — the file downloads before it
  plays, and it counts against the repo size forever once committed.
- **Format**: `.mp3` is the safest cross-browser choice. `.m4a`/AAC also works
  everywhere current; `.wav` is uncompressed and far too large.
- Converting an m4a: `ffmpeg -i in.m4a -b:a 128k -ac 1 out.mp3`
