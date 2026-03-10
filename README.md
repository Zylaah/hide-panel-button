# Hide Panel UI Menu Button for Zen

## Overview

This mod hides the app menu button (Zen/hamburger) by default in Zen Browser. The button becomes visible only when:

- The panel has a **badge** (e.g. update notification)
- The **panel is open** (including when it opens on its own)

## Installation

1. Place the `theme.json` and `hide_panel_button.uc.js` files in your Zen Browser profile mod directory.
2. Restart Zen Browser.

The exact path depends on your Zen installation and OS. Typically:
- **Linux**: `~/.zen/mods/` or similar
- **Windows**: `%APPDATA%\Zen\mods\` or similar
- **macOS**: `~/Library/Application Support/Zen/mods/` or similar

Ensure both files are in the same directory so Zen can load the script via `theme.json`.
