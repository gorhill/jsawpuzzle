# JSaw Puzzle

A browser extension to create and solve jigsaw puzzles.

The extension is Manifest V3-compliant.

A project [started in 2009](https://github.com/gorhill/jigsawpuzzle-rhill) but never completed as originally envisioned. This repository is that project brought to completion.

## Picture feeds

The extension can fetch random pictures from different feeds. Currently it can fetch from [Wikimedia Commons](https://commons.wikimedia.org/) and [Public Domain Pictures](https://www.publicdomainpictures.net/).


## To build the extension

At the command line, type `make firefox` or `make chromium` to build the extension for either Firefox or Chromium. A `jsawpuzzle.firefox` or `jsawpuzzle.chromium` folder will appear under `./build/`, which can be side-loaded as an extension in Firefox or Chromium.
