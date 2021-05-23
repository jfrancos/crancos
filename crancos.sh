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
npm install -D tailwindcss @snowpack/plugin-postcss @jadex/snowpack-plugin-tailwindcss-jit
npm install react-icons clsx
npm install -g netlify-cli

# Adjust snowpack.config.js for tailwind
echo "module.exports.plugins = module.exports.plugins.concat(['@snowpack/plugin-postcss', '@jadex/snowpack-plugin-tailwindcss-jit'])
module.exports.devOptions.port = 3000
module.exports.devOptions.open = \"none\"
" >>snowpack.config.js

# Replace sample code with a minimal, full-screen app
rm src/App.css src/logo.svg
echo "import React, { useState, useEffect, useRef } from 'react';
import { FaReact } from 'react-icons/fa';

// https://react-icons.github.io/react-icons/icons

function App() {
  return (
    <div className=\"h-full w-full justify-center items-center\">
      <div className=\"grid\">
        <FaReact className=\"grid-overlay h-96 w-96 text-purple-100\" />
        <div className=\"grid-overlay justify-center items-center\">Hello, Crancos!</div>
      </div>
    </div>
  );
}

export default App;
" >src/"$APP"

# Add minimal postcss and tailwind config files
# Setup css file to incorporate tailwind + set default div display
# Copy snippets file
cp -r "$BASE"/template/. .

# update git repo
git add -A
git commit -m "setup tailwind, css rules, snippets"

# Open project with vscode, if it's installed
if command -v code &>/dev/null; then
  code . -g src/"$APP":9:7
fi
