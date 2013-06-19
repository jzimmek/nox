#!/bin/bash

mkdir -p dist

cp src/nox.js dist/
cat src/nox_* >> dist/nox.js