#!/bin/zsh
set -eu

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
service_label="com.musse.slopalytics-benchmarks"
service_target="gui/$(id -u)/$service_label"
agent_path="$HOME/Library/LaunchAgents/$service_label.plist"

case "${1:-status}" in
  start)
    if [[ ! -f "$project_dir/dist/index.html" ]]; then
      print -u2 'Build the site with pnpm build before starting the local service.'
      exit 1
    fi
    mkdir -p "$project_dir/.local" "$HOME/Library/LaunchAgents"
    python3 - "$project_dir" "$(command -v node)" "$agent_path" "$service_label" <<'PY'
import plistlib
import sys
from pathlib import Path

project, node, destination, label = sys.argv[1:]
configuration = {
    'Label': label,
    'ProgramArguments': [node, f'{project}/node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4387', '--strictPort'],
    'WorkingDirectory': project,
    'RunAtLoad': True,
    'KeepAlive': True,
    'ThrottleInterval': 5,
    'StandardOutPath': f'{project}/.local/server.log',
    'StandardErrorPath': f'{project}/.local/server-error.log',
}
Path(destination).write_bytes(plistlib.dumps(configuration))
PY
    if launchctl print "$service_target" >/dev/null 2>&1; then
      launchctl kickstart -k "$service_target"
    else
      launchctl bootstrap "gui/$(id -u)" "$agent_path"
    fi
    print 'Running at http://127.0.0.1:4387'
    ;;
  stop)
    launchctl bootout "$service_target"
    print 'Stopped. The service can be started again with pnpm local:start.'
    ;;
  status)
    launchctl print "$service_target"
    ;;
  *)
    print -u2 'Usage: scripts/local-service.sh start|stop|status'
    exit 1
    ;;
esac
