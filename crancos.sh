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
npm install -D tailwindcss @snowpack/plugin-postcss @jadex/snowpack-plugin-tailwindcss-jit
npm install react-icons

# Adjust snowpack.config.js for tailwind
echo "module.exports.plugins = module.exports.plugins.concat(['@snowpack/plugin-postcss', '@jadex/snowpack-plugin-tailwindcss-jit'])
module.exports.devOptions.port = 3000" >>snowpack.config.js

# Add minimal postcss and tailwind config files
echo "module.exports = {
    plugins: {
      tailwindcss: {},
    },
  };" >postcss.config.js

echo "module.exports = {
    mode: 'jit',
    purge: ['./public/**/*.html', './src/**/*.{js,jsx,ts,tsx,vue}'],
  };" >tailwind.config.js

# Setup css file to incorporate tailwind + set default div display
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

div {
  display: flex;

}
" >src/index.css

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

mkdir .vscode
echo '{
  "Add handler with event param": {
    "prefix": "h",
    "scope": "javascriptreact",
    "body": [
      "const handle$1 = (${2:{ target: { value \\} \\}}) => {",
      "  $0",
      "}"
    ],
    "description": "Add handler with event param"
  },
  "Add mapped handler with event param": {
    "prefix": "hi",
    "scope": "javascriptreact",
    "body": [
      "const handle$1 = (index) => (${2:{ target: { value \\} \\}}) => {",
      "  $0",
      "}"
    ],
    "description": "Add mapped handler with event param"
  },
  "Add a div w/ className": {
    "prefix": "d",
    "scope": "javascriptreact",
    "body": ["<div className=\"$1\">", "  $2", "</div>"],
    "description": "Add a div w/ className"
  },
  "Use state": {
    "prefix": "s",
    "scope": "javascriptreact",
    "body": [
      "const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:null})"
    ],
    "description": "Use state"
  },
  "Update at index": {
    "prefix": "ui",
    "scope": "javascriptreact",
    "body": [
      "set${1/(.*)/${1:/capitalize}/}($1 => [",
      "  ...$1.slice(0, index),",
      "  { ...$1[index], $2},",
      "  ...$1.slice(index + 1),",
      "]);"
    ],
    "description": "Update at index"
  },
  "Add event listener": {
    "scope": "javascriptreact",
    "prefix": "el",
    "body": [
      "useEffect(() => {",
      "  const handle$1 = ({$3}) => {",
      "    $0",
      "  };",
      "  document.addEventListener('$2', handle$1);",
	  "  return () => document.removeEventListener('$2', handle$1);",
	  "});"
    ],
    "description": "Add event listener"
  }
}' >.vscode/crancos.code-snippets

# update git repo
git add -A
git commit -m "setup tailwind, css rules, snippets"

# Open project with vscode, if it's installed
if command -v code &>/dev/null; then
  code . -g src/"$APP":9:7
fi
