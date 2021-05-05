#!/bin/bash
# create-tailwind-snowpack-react-app

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
npm install -D tailwindcss @snowpack/plugin-postcss

# Adjust snowpack.config.js for tailwind
echo "module.exports.plugins = module.exports.plugins.concat(['@snowpack/plugin-postcss'])" >>snowpack.config.js

# Add minimal postcss and tailwind config files
echo "module.exports = {
    plugins: {
      tailwindcss: {},
    },
  };" >postcss.config.js

echo "module.exports = {
    purge: ['./public/**/*.html', './src/**/*.{js,jsx,ts,tsx,vue}'],
  };" >tailwind.config.js

# Setup almost-minimal css file to incorporate tailwind
echo "@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body,
#root {
  height: 100%;
}

.grid-overlay {
  grid-row-start: 1;
  grid-column-start: 1;
}
" >src/index.css

# Replace sample code with a minimal, full-screen app
rm src/App.css src/logo.svg
echo "import React, { useState, useEffect } from 'react';

function App() {
  return (
    <div className=\"h-full flex flex-col justify-center items-center\">
      Hello, TWSPRA!
    </div>
  );
}

export default App;
" >src/"$APP"

git add -A
git commit -m "setup tailwind"

# Open project with vscode, if it's installed
if command -v code &>/dev/null; then
  code . -g src/"$APP":6:7
fi
