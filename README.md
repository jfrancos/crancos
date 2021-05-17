# CRA a la [Francos](https://francosjust.in)

Usage:

`npx crancos [--ts] [project-name]`

Bootstraps an environment analogous to create-react-app.

**Please NB the CSS file sets up all divs with `display: flex;`**

The above command will run a script that:

1. Runs `create-snowpack-app` (this is more specifically analogous to `create-react-app`)
   
2. Installs `npm` packages and sets up config files necessary for Tailwind (including [Xeevis' patch](https://github.com/jadex/snowpack-plugin-tailwindcss-jit) for getting jit working with snowpack)

3. Installs react-icons

4. Adds some CSS that
   1. sets all divs to use `display: flex` by default

   2. creates a `grid-overlay` class for `div` superimposition  sans `relative`/`absolute`

5. Replaces the default CRA page with a more minimal one (which demonstrates `grid-overlay`)

6. Opens up your main App file in vscode (if it's installed)

7. Takes under 30 seconds on my 2017 Core i7