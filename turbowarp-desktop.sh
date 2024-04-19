#!/bin/bash

# Enable Wayland if it is available
# From https://github.com/flathub/com.slack.Slack/blob/62e3c2d2236f2e8375c2bdd9c4a89158a004774a/slack.sh
WAYLAND_SOCKET=${WAYLAND_DISPLAY:-"wayland-0"}
if [[ -e "$XDG_RUNTIME_DIR/${WAYLAND_SOCKET}" || -e "${WAYLAND_DISPLAY}" ]]
then
    FLAGS="--enable-features=WaylandWindowDecorations --ozone-platform-hint=auto"
fi

exec zypak-wrapper /app/turbowarp/turbowarp-desktop $FLAGS "$@"
