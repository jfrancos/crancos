#!/bin/bash
# create-tailwind-snowpack-react-app

# Create snowpack app with react template
npx create-snowpack-app $1 --template @snowpack/app-template-react
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
      TWSPRA
    </div>
  );
}

export default App;
" >src/App.jsx

# Open project with vscode
code .
