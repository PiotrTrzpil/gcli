#!/usr/bin/env bash

set -e

npm version patch
npm publish
sleep 3
npm install -g @piotrtrzpil/gcli
