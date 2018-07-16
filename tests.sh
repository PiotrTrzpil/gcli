#!/usr/bin/env bash

set -e

./gcli github rateLimit

./gcli github viewer url

./gcli github viewer gists --first 10 nodes id
./gcli github viewer repositories --first 5 nodes name