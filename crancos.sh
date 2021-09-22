#!/bin/sh
# CRA a la Francos

CWD="$(pwd)"
INVOKED_BIN="$(node -e "console.log(require('fs').realpathSync(\"$0\"))")"
INVOKED_PACKAGE="$(dirname "$INVOKED_BIN")"

JS_TEMPLATE_VER=2.1.2
TS_TEMPLATE_VER=2.1.3

JS_TEMPLATE=@snowpack/app-template-react
TS_TEMPLATE=@snowpack/app-template-react-typescript

TEMPLATE="$JS_TEMPLATE"
TEMPLATE_VER="$JS_TEMPLATE_VER"

if [[ "$1" == --ts ]]; then
    shift
    TEMPLATE="$TS_TEMPLATE"
    TEMPLATE_VER="$TS_TEMPLATE_VER"
fi

if [ -e $1 ]; then
    echo -e "\033[0;31m$1" already exists, exiting
    exit
fi

mkdir -p "$1"/tmp
cd "$1"/tmp
echo {} > package.json
npm install "$TEMPLATE@$TEMPLATE_VER"
cp -r "$INVOKED_PACKAGE/merge-with-snowpack-app-template-react" .

REACT_SKEL_PATH="$CWD/$1/tmp/node_modules/$TEMPLATE"
CRANCOS_SKEL_PATH="$CWD/$1/tmp/merge-with-snowpack-app-template-react"

mkdir build
cd build

# Merge package.json
REACT_PACKAGE="$(cat "$REACT_SKEL_PATH"/package.json)"
CRANCOS_PACKAGE="$(cat "$CRANCOS_SKEL_PATH"/package.json)"
NETLIFY_PATH="$(command -v netlify)"

if [ -z "$NETLIFY_PATH" ]; then
    echo -e "\033[0;31m"Installing netlify-cli will take an extra ~40s.
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
        },
        keywords: [
            'csa-template',
        ]
    }
    const newPackage = JSON.stringify(
        mergedPackage,
        null,
        2
    )
    console.log(newPackage)
" >./package.json
rm "$REACT_SKEL_PATH"/package.json
rm "$CRANCOS_SKEL_PATH"/package.json

# Merge snowpack.config
cp "$REACT_SKEL_PATH"/snowpack.config.mjs ./snowpack-base.config.mjs
cp "$CRANCOS_SKEL_PATH"/snowpack.config.mjs .
rm "$REACT_SKEL_PATH"/snowpack.config.mjs
rm "$CRANCOS_SKEL_PATH"/snowpack.config.mjs

# Merge src
mv "$CRANCOS_SKEL_PATH"/src src
cp "$REACT_SKEL_PATH"/src/index.?sx src/
if [ -f src/index.tsx ]; then
    mv src/App.jsx src/App.tsx
fi
rm -rf "$REACT_SKEL_PATH"/src

# Merge everything else
shopt -s dotglob
mv "$REACT_SKEL_PATH"/* .
mv "$CRANCOS_SKEL_PATH"/* .
rm -rf "$REACT_SKEL_PATH" "$CRANCOS_SKEL_PATH" "$TARBALL"
rm -rf "$TARBALL" install.sh

cd "$CWD"
npx create-snowpack-app@1.10.0 "$1" --template "./$1/tmp/build" --force
rm -rf "$1/tmp"

if command -v code &>/dev/null; then
    cd "$1"
    code . -g "$(ls src/Controller.?sx)":8
fi
