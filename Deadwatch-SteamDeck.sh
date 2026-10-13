#!/usr/bin/env bash
set -u

launcher_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
appimage="$launcher_dir/Deadwatch-0.36.165-x86_64.AppImage"
log_dir="${XDG_STATE_HOME:-$HOME/.local/state}/deadwatch"
log_file="$log_dir/steamdeck.log"

mkdir -p "$log_dir"
exec >>"$log_file" 2>&1

echo ""
echo "===== Deadwatch startup $(date -Iseconds) ====="
echo "Session: ${XDG_SESSION_TYPE:-unknown}; SteamOS: $(uname -a)"

if [[ ! -f "$appimage" ]]; then
  echo "Missing $appimage"
  exit 1
fi

chmod +x "$appimage"
export ELECTRON_OZONE_PLATFORM_HINT=x11
export APPIMAGE_EXTRACT_AND_RUN=1

exec "$appimage" --no-sandbox --disable-gpu-sandbox "$@"
