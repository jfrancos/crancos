#!/bin/bash

TARBALL="$(npm pack @snowpack/app-template-react)"
tar xzf "$TARBALL"

REACT_SKEL_PATH=package
CRANCOS_SKEL_PATH=merge-with-snowpack-app-template-react

# Merge package.json
REACT_PACKAGE="$(cat "$REACT_SKEL_PATH"/package.json)"
CRANCOS_PACKAGE="$(cat "$CRANCOS_SKEL_PATH"/package.json)"
NETLIFY_PATH="$(command -v netlify)"

if [ -z "$NETLIFY_PATH" ]; then
    echo -e "\033[0;31m"Crancos will take an extra ~40s, to install netlify-cli.
    echo -e "\033[0;31m"Install it globally e.g. using \`nvm\` to improve the time it takes to \"create app\"
    INSTALL_NETLIFY="\"netlify-cli\": \"^3.30.3\""
fi

node -e "
    const reactPackage = $REACT_PACKAGE
    const crancosPackage = $CRANCOS_PACKAGE
    const mergedPackage = { 
        scripts: {
            ...reactPackage.scripts,
            ...crancosPackage.scripts
        },
        dependencies: {
            ...reactPackage.dependencies,
            ...crancosPackage.dependencies
        },
        devDependencies: {
            ...reactPackage.devDependencies,
            ...crancosPackage.devDependencies,
            $INSTALL_NETLIFY
        }
    }
    const newPackage = JSON.stringify(
        mergedPackage,
        null,
        2
    )
    console.log(newPackage)
" >package.json
rm "$REACT_SKEL_PATH"/package.json
rm "$CRANCOS_SKEL_PATH"/package.json

# Merge snowpack.config
cp "$REACT_SKEL_PATH"/snowpack.config.mjs .
cat "$CRANCOS_SKEL_PATH"/snowpack.config.mjs >> snowpack.config.mjs
rm "$REACT_SKEL_PATH"/snowpack.config.mjs
rm "$CRANCOS_SKEL_PATH"/snowpack.config.mjs

# Merge src
mv "$CRANCOS_SKEL_PATH"/src src
cp "$REACT_SKEL_PATH"/src/index.jsx src/
rm -rf "$REACT_SKEL_PATH"/src

# Merge everything else
mv "$REACT_SKEL_PATH"/* .
mv "$CRANCOS_SKEL_PATH"/* .
rm -rf "$REACT_SKEL_PATH" "$CRANCOS_SKEL_PATH"
rm -rf "$TARBALL" preinstall.sh
