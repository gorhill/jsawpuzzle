#!/usr/bin/env bash
#
# This script assumes a linux environment

set -e

DES=$1

cp -R _locales     $DES/
cp -R audio        $DES/
cp -R feeds        $DES/
cp -R images       $DES/
cp -R tesselations $DES/
cp -R *.css        $DES/
cp -R *.js         $DES/
cp    *.html       $DES/
