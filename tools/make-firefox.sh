#!/usr/bin/env bash
#
# This script assumes a linux environment

set -e

echo "*** jsawpuzzle.firefox: Creating web store package"

DES=build/jsawpuzzle.firefox
rm -rf $DES
mkdir -p $DES

echo "*** jsawpuzzle.firefox: Copying common files"
bash ./tools/copy-common-files.sh $DES

echo "*** jsawpuzzle.firefox: Copying chromium-specific files"
cp platform/firefox/*.json $DES/

if [ -n "$1" ]; then
    echo "*** jsawpuzzle.firefox: Patching manifest.json"
    tmp=$(mktemp)
    jq --arg a "$1" '.version = $a' "$DES/manifest.json" > "$tmp" && mv "$tmp" "$DES/manifest.json"
    echo "*** jsawpuzzle.firefox: Creating versioned package..."
    pushd $DES > /dev/null
    zip ../$(basename $DES).xpi -qr *
    popd > /dev/null
    mv build/jsawpuzzle.firefox.xpi build/jsawpuzzle_"$1".firefox.xpi
fi

echo "*** jsawpuzzle.firefox: Package done."
