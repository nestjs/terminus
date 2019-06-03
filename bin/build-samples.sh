#!/usr/bin/env bash

find sample -maxdepth 1 -type d \( ! -name sample \) -exec bash -c "cd '{}' && npm i && npm run build" \;
