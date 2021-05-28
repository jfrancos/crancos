#!/bin/bash
# CRA a la Francos

# If we're running locally, $BASE (package contents) is CWD:
BASE="$(dirname "$0")"

# Else if we're running via npx, $BASE
# is CWD/../lib/node_modules/[package name]:
if [ ! -f "$BASE"/package.json ]; then
  BASE="$(dirname "$BASE")"/lib/node_modules/"$(basename "$0")"
fi

# Make sure we have absolute path
BASE="$(cd "$BASE" && pwd)"

JS_TEMPLATE=@snowpack/app-template-react@2.1.2
TS_TEMPLATE=@snowpack/app-template-react-typescript
TEMPLATE="$JS_TEMPLATE"

if [[ "$1" == --ts ]] ; then
    shift
    TEMPLATE="$TS_TEMPLATE"
    mv "$CRANCOS_SKEL_PATH/src/App.jsx" "$CRANCOS_SKEL_PATH/src/App.tsx"
fi
REACT_SKEL_PATH=package
CRANCOS_SKEL_PATH=merge-with-snowpack-app-template-react

if [ -f $1 ]; then
    echo -e "\033[0;31m$1" already exists, exiting
    exit
fi

mkdir -p "$1"/template
cd "$1"/template
TARBALL="$(npm pack "$TEMPLATE")"
tar xzf "$TARBALL"
cp -r "$BASE"/merge-with-snowpack-app-template-react .

# exit

# cd ../..

# BASENAME="$(basename "$(pwd)")"


# add versions to templates
# if done as a template I will need two versions 
# in order to have a ts version
# if not done as a template I can have ts as an option


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
" >../package.json
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
rm -rf "$REACT_SKEL_PATH"/src 

# Merge everything else
shopt -s dotglob
mv "$REACT_SKEL_PATH"/* .
mv "$CRANCOS_SKEL_PATH"/* .
rm -rf "$REACT_SKEL_PATH" "$CRANCOS_SKEL_PATH" "$TARBALL"
rm -rf "$TARBALL" install.sh


mv ./* ..
cd ..
rm -rf template
npm install

git init
git add -A
git commit -m "initial commit"


if command -v code &>/dev/null; then
  code . -g "$(ls src/App.?sx)":9:7
fi
