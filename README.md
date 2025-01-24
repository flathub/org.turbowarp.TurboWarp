## Flatpak specific notes

Gamepads will not work in the Flatpak version (we believe this has the same cause as https://github.com/flathub/org.chromium.Chromium/issues/40)

By default, drag and drop will only work with files in your downloads, pictures, music, or desktop folders. To allow other folders, run this command:

```bash
flatpak override org.turbowarp.TurboWarp --filesystem=/path/to/folder/
```
