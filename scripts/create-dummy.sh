#!/bin/sh

D="$(mktemp -d -u /tmp/revealjs-markdown-server-XXXX)/"
mkdir -p "${D}md"
echo "${D}"
seq 2 20 | sed 's%.*%echo "## test &" > '"${D}md"'/&.md%e'

