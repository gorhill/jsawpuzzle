# https://stackoverflow.com/a/6273809
run_options := $(filter-out $@,$(MAKECMDGOALS))

.PHONY: all clean chromium firefox

sources := $(wildcard * src/* src/*/* src/*/*/*)
platform := $(wildcard platform/* platform/*/*)

all: chromium firefox

build/jsawpuzzle.chromium: tools/make-chromium.sh $(sources) $(platform)
	tools/make-chromium.sh

# Build the extension for Chromium.
chromium: build/jsawpuzzle.chromium

# Build the extension for Opera.
build/jsawpuzzle.firefox: tools/make-firefox.sh $(sources) $(platform)
	tools/make-firefox.sh

# Build the extension for Firefox.
firefox: build/jsawpuzzle.firefox

clean:
	rm -rf build
