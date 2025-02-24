## Flatpak specific notes

Gamepads will not work in the Flatpak version (we believe this has the same cause as https://github.com/flathub/org.chromium.Chromium/issues/40)<br>
However, there is a workaround by giving read-only access to `/run/udev` with Flatseal or by running this command:

```bash
flatpak override org.turbowarp.TurboWarp --filesystem=/run/udev:ro
```

By default, drag and drop will only work with files in your downloads, pictures, music, or desktop folders. To allow other folders, run this command:

```bash
flatpak override org.turbowarp.TurboWarp --filesystem=/path/to/folder/
```

## Updating to new versions

To update to latest stable tag:

```bash
node generate-sources.js
```

To update to specific commit:

```bash
node generate-sources.js <TurboWarp/desktop commit hash>
```
