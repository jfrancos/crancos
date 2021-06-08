#!/bin/sh

if [ -d .netlify ]; then
    exit
fi

CURRENT_USER="$(netlify api getCurrentUser)"
SLUG="$(node -e "console.log($CURRENT_USER.slug)")"
SITE="$(netlify sites:create -a "$SLUG" -n' ')"
ID="$(echo "$SITE" | grep 'Site ID' | grep -o '[a-z0-9-]*$')"

netlify link --id "$ID"