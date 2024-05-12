# JSaw Puzzle

A browser extension to create and solve jigsaw puzzles.

The extension is Manifest V3-compliant.

## Screenshots

![Screenshot 1](https://raw.githubusercontent.com/gorhill/jsawpuzzle/main/screenshots/screenshot-1.png)

![Screenshot 2](https://raw.githubusercontent.com/gorhill/jsawpuzzle/main/screenshots/screenshot-2.png)

![Screenshot 3](https://raw.githubusercontent.com/gorhill/jsawpuzzle/main/screenshots/screenshot-3.png)

## Picture feeds

The extension can fetch random pictures from different feeds. Currently it can fetch from [Wikimedia Commons](https://commons.wikimedia.org/) and [Public Domain Pictures](https://www.publicdomainpictures.net/).

## To build the extension

At the command line, type `make firefox` or `make chromium` to build the extension for either Firefox or Chromium. A `jsawpuzzle.firefox` or `jsawpuzzle.chromium` folder will appear under `./build/`, which can be side-loaded as an extension in Firefox or Chromium.

## Motivation

A project [started in 2009](https://github.com/gorhill/jigsawpuzzle-rhill) but never completed as originally envisioned. This repository is that project brought to completion.
