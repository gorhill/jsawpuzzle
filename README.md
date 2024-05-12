# JSaw Puzzle

A browser extension to create and solve jigsaw puzzles.

The extension is Manifest V3-compliant.

## Screenshots

![Screenshot 1](https://raw.githubusercontent.com/gorhill/jsawpuzzle/main/screenshots/screenshot-1.png)

<details><summary>More...</summary>

![Screenshot 2](https://raw.githubusercontent.com/gorhill/jsawpuzzle/main/screenshots/screenshot-2.png)

![Screenshot 3](https://raw.githubusercontent.com/gorhill/jsawpuzzle/main/screenshots/screenshot-3.png)

</details>

## Picture feeds

The extension can fetch random pictures from different feeds. Currently it can fetch from [Wikimedia Commons](https://commons.wikimedia.org/) and [Public Domain Pictures](https://www.publicdomainpictures.net/).

**Important:** Firefox version 126.0 and below requires that you explicitly grant permissions to be able fetch pictures from remote servers:
![image](https://github.com/gorhill/jsawpuzzle/assets/585534/d4c2b4c6-4c56-4154-b276-8e62fb90aeb5)

## To build the extension

At the command line, type `make firefox` or `make chromium` to build the extension for either Firefox or Chromium. A `jsawpuzzle.firefox` or `jsawpuzzle.chromium` folder will appear under `./build/`, which can be side-loaded as an extension in Firefox or Chromium.

## Motivation

A project [started in 2009](https://github.com/gorhill/jigsawpuzzle-rhill) but never completed as originally envisioned. This repository is that project brought to completion.
