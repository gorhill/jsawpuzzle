#!/usr/bin/env bash
#
# This script assumes a linux environment

set -e

echo "*** jsawpuzzle.chromium: Creating web store package"

DES=build/jsawpuzzle.chromium
rm -rf $DES
mkdir -p $DES

echo "*** jsawpuzzle.chromium: Copying common files"
bash ./tools/copy-common-files.sh $DES

echo "*** jsawpuzzle.chromium: Copying chromium-specific files"
cp platform/chromium/*.json $DES/

if [ -n "$1" ]; then
    echo "*** jsawpuzzle.chromium: Patching manifest.json"
    tmp=$(mktemp)
    jq --arg a "$1" '.version = $a' "$DES/manifest.json" > "$tmp" && mv "$tmp" "$DES/manifest.json"
    echo "*** jsawpuzzle.chromium: Creating versioned package"
    pushd $(dirname $DES/) > /dev/null
    zip jsawpuzzle_"$1".chromium.zip -qr $(basename $DES/)/*
    popd > /dev/null
fi

echo "*** jsawpuzzle.chromium: Package done."
