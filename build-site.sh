#!/bin/bash
set -eEuo pipefail
cd `dirname "$0"` && SCRIPT_DIR=`pwd -P`

rm -rf dist
cp -f node_modules/em-fceux/dist/fceux.* static
./scripts/build-site.py static dist
