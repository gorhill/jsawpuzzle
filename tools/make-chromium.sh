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

echo "*** jsawpuzzle.chromium: Package done."
