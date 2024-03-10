#!/bin/bash

FLAGS=""

# enable Wayland if --socket=wayland is enabled
if [[ "$XDG_SESSION_TYPE" == "wayland" ]]; then
    # WAYLAND_DISPLAY can be the display name or an absolute path
    if [[ -e "$XDG_RUNTIME_DIR/${WAYLAND_DISPLAY:-"wayland-0"}" ]] || [[ -e "$WAYLAND_DISPLAY" ]]; then
        FLAGS="--ozone-platform-hint=auto"
    fi
fi

exec zypak-wrapper /app/turbowarp/turbowarp-desktop $FLAGS "$@"
