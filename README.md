### Flatpak specific notes

Gamepads will not work in the Flatpak version (we believe this has the same cause as https://github.com/flathub/org.chromium.Chromium/issues/40)

By default, the app may be limited to only accessing projects in your home directory. To allow accessing other folders, run this command:

```
flatpak override org.turbowarp.TurboWarp --filesystem=/path/to/folder/
```

### Development

To update:

 - Replace `commit` in org.turbowarp.TurboWarp.yml with latest commit from https://github.com/TurboWarp/desktop/commits/master
 - `python3 flatpak-node-generator.py npm turbowarp-desktop/package-lock.json --xdg-layout`
 - `python3 update-packager.py` (if packager changed)
 - `python3 update-library.py` (if library files changed)
