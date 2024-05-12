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

echo "*** jsawpuzzle.firefox: Package done."
