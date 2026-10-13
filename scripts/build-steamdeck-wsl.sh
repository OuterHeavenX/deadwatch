#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd -- "$script_dir/.." && pwd)"
build_dir="$(mktemp -d /tmp/deadwatch-build.XXXXXX)"
node_dir="$(mktemp -d /tmp/deadwatch-node.XXXXXX)"
archive="$(curl -fsSL https://nodejs.org/dist/latest-v22.x/ | grep -o 'node-v22[^"]*linux-x64.tar.xz' | head -n1)"

curl -fsSL "https://nodejs.org/dist/latest-v22.x/$archive" -o "$node_dir/node.tar.xz"
tar -xJf "$node_dir/node.tar.xz" -C "$node_dir"
export PATH="$node_dir/${archive%.tar.xz}/bin:$PATH"

tar -C "$project_dir" --exclude=node_modules --exclude=dist --exclude=.git -cf - . \
  | tar -C "$build_dir" -xf -

cd "$build_dir"
npm ci
npm run dist:linux
cp dist/*.AppImage dist/*.tar.gz "$project_dir/dist/"
ls -lh dist/*.AppImage dist/*.tar.gz
