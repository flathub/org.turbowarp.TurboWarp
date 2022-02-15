To update:

 - Replace `commit` with latest commit from https://github.com/TurboWarp/desktop/commits/master
 - `python3 flatpak-node-generator.py npm package-lock.json`
 - `python3 update-library.py` (if library files changed)
 - `python3 update-packager.py` (if packager changed)
