<p align="center">
  <img src="assets/flock/flock-universal-1024.png" width="128" height="128" alt="Flock" />
</p>

<h1 align="center">Flock</h1>

a T3 Code fork. Its code comes from [seatedro/t3code](https://github.com/seatedro/t3code), itself a
fork of [pingdotgg/t3code](https://github.com/pingdotgg/t3code).

---

Flock is an "agent harness control surface". It lets you drive the coding agents on your machine
from a desktop app, a web app, and an Android app.

Works with your subscriptions on Claude Code, Codex, Cursor, Grok Build, OpenCode, Google
Antigravity, and fx. If they're set up on your computer, Flock can control them.

## Downloads

Everything below comes from [Releases](https://github.com/itsmaybetokyo/flock/releases). Nightly
builds are published as prereleases; grab the newest one and pick your platform.

| Platform | Asset |
| --- | --- |
| Windows x64 / arm64 | `Flock-<version>-x64.exe` (also `-arm64.exe`) |
| Linux x64 / arm64 | `Flock-<version>-x86_64.AppImage` / `-arm64.AppImage`, or the matching `.deb` |
| Android | `flock-<version>-android-arm64-v8a.apk` |
| Command line | `t3-<version>-<platform>-<arch>.zip` or `.tar.gz` |

The Android APK is signed with this fork's own key, not Google Play's. If T3 Code from the Play
Store is already installed, uninstall it first; Android refuses an update whose key differs.

The self-contained CLI archives are checked against the `SHA256SUMS` asset on the same release.

## Installing the Linux packages

The AppImage runs as-is:

```bash
chmod +x Flock-*.AppImage
./Flock-*.AppImage
```

The `.deb` installs system-wide:

```bash
sudo apt install ./Flock-*.deb
```

## Install at least one provider

Flock controls a provider; it does not replace one.

- Codex: install [Codex CLI](https://developers.openai.com/codex/cli) and run `codex login`
- Claude: install [Claude Code](https://claude.com/product/claude-code) and run `claude auth login`
- Cursor: install [Cursor CLI](https://cursor.com/cli) and run `agent login`
- Grok Build: install [Grok Build CLI](https://x.ai/cli) and run `grok login`
- OpenCode: install [OpenCode](https://opencode.ai) and run `opencode auth login`
- Antigravity: enable it in Settings, then use **Install Antigravity** and **Sign in with Google**
- fx: install [fx](https://fx.sh) and run `fx login` on the machine running the Flock server
  ([setup guide](./docs/user/providers-fx.md))

## Following upstream

Flock tracks [seatedro/t3code](https://github.com/seatedro/t3code). A daily job merges upstream
into `rohit/changes` and rebuilds the releases, so upstream's fixes and features arrive without a
manual rebase. Only the fork's own surface stays local: the Flock icon and name, the signed Android
APK, and the release workflow.

## Documentation

Full docs live in [docs/](./docs).

- [FAQ](./docs/user/faq.md)
- [Install and first run](./docs/user/install.md)
- [Permission modes](./docs/user/permission-modes.md)
- [Keyboard shortcuts](./docs/user/keybindings.md)
- [Project settings](./docs/user/project-settings.md)
- [Appearance preferences](./docs/user/appearance.md)
- [Remote access from a phone or another machine](./docs/user/remote-access.md)
- [Connect Claude Code, Codex, ChatGPT and other agents over MCP](./docs/user/outside-agents.md)
- [Keeping app and server in sync](./docs/user/updating.md)
- [Source control integrations](./docs/user/source-control.md)
- Multiple accounts: [Codex](./docs/user/providers-codex.md) · [Claude](./docs/user/providers-claude.md)
- [Run Flock as a background service](./docs/user/background-service.md)

## Building from source

```bash
curl -fsSL https://vite.plus | bash   # macOS / Linux
irm https://vite.plus/ps1 | iex       # Windows
vp i
vp run dev
```

The architecture and its constraints start at [docs/internals/overview.md](./docs/internals/overview.md).

