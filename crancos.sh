#!/bin/bash
# CRA a la Francos

# If we're running locally, $BASE is CWD:
BASE="$(dirname "$0")"

# If we're running via npx, $BASE
# is $CWD/../lib/node_modules/[package name]:
if [ ! -f "$BASE"/package.json ]; then
  BASE="$(dirname "$BASE")"/lib/node_modules/"$(basename "$0")"
fi

# Make sure we have absolute path
BASE="$(cd "$BASE" && pwd)"

TEMPLATE=app-template-react
APP=App.jsx

if [ "$1" == "--ts" ]; then
  shift
  TEMPLATE=app-template-react-typescript
  APP=App.tsx
fi

# Create snowpack app with react template
npx create-snowpack-app $1 --template @snowpack/"$TEMPLATE"
cd $1

# Install modules necessary for tailwind (tailwind runs via postcss)
npm install -D autoprefixer tailwindcss @snowpack/plugin-postcss @jadex/snowpack-plugin-tailwindcss-jit
npm install react-icons clsx
npm install -g netlify-cli

# Adjust snowpack.config.js for tailwind
echo "module.exports.plugins = module.exports.plugins.concat(['@snowpack/plugin-postcss', '@jadex/snowpack-plugin-tailwindcss-jit'])
module.exports.devOptions.port = 3000
module.exports.devOptions.open = \"none\"
" >>snowpack.config.js

# Replace sample code with a minimal, full-screen app
rm src/App.css src/logo.svg

# Add minimal postcss and tailwind config files
# Setup css file to incorporate tailwind + set default div display
# Copy snippets file
cp -r "$BASE"/template/. .
mv src/App.jsx src/"$APP"

CLOUD_INIT="[ -d .netlify ] || netlify link --id \$(netlify sites:create -a \$(node -e 'console.log(JSON.parse(process.argv[1]).slug)' \\\"\\\$(netlify api getCurrentUser)\\\") -n' ' | grep 'Site ID' | grep -o '[a-z0-9-]*$')"

TUNNEL="npm run cloud-init ; netlify dev --live"

PACKAGE="$(cat package.json)"

node -e "const package = $PACKAGE; console.log(JSON.stringify({...package, scripts: {...package.scripts, 'cloud-init': \"$CLOUD_INIT\", 'tunnel': \"$TUNNEL\" }}, null, 2))" > package.json

# update git repo
git add -A
git commit -m "setup tailwind, css rules, snippets"

# Open project with vscode, if it's installed
if command -v code &>/dev/null; then
  code . -g src/"$APP":9:7
fi
