In the words of Alan Kay:
> # Simple things should be simple

Once you've created the basic meat of your user-document-based app, it shouldn't take any extra time to make it reactive and offline-first.

This is a CRA-style template you can use to create reactive[^1] offline-first user-document-based apps.  To achieve this, I've put together:
- RxDB (browser-based NoSQL database)
- FaunaDB (cloud data storage)
- Magic (passwordless auth and session management)
- An npm run script that implements RxDB's GraphQL replication plugin requirements via FQL
- A custom hook that exposes an RxDB collection and a reactive[^2] query

Also out-of-the-box:
- Snowpack (frontend build)
- Tailwind (utility-first CSS)
- React (user interface)
- Bonus!  A demo TODO app

[^1]: Reactive as in, updates to user documents in one browser will be immediately reflected in all other browsers where the same user is logged in, via Fauna's streaming

[^2]: Reactive as in, changes to the state of the local RxDB database will be reflected in the hook variable and cause a rerender


## Try it out

0. You have a text editor such as VS Code, and accounts at fauna.com and magic.link
1. `npx crancos [your-project]`
   - You can do steps (2) and (3) while (1) is running
2. Get public and private keys from magic.link
      - "All Apps" -> "New App"
      - Choose a name
      - Save
3. Get a private key from fauna
   - "CREATE DATABASE"
      - Choose a name
      - Any Region Group is fine, "Classic" is a good default
      - CREATE
   - Security -> NEW KEY -> SAVE (use defaults)
4. Put your public magic key into `snowpack.config.mjs`:
   ```
   ...
   config.env = { MAGIC_PUBLISHABLE_KEY: 'pk_live_...' };`
   ...
   ```
5. Put your private magic and fauna keys into .env:
   ```
   MAGIC_SECRET=sk_live_...
   FAUNA_SECRET=fn...
   ```
5. `npm run provision-fauna`
6. `npm run dev`


### Kinds of offline-first

- **User data** is offline-first via RxDB.  This works automatically in both `dev` and `build` (`npm run build`) modes.
- **The react site itself** is offline-first via workbox.  This doesn't work in `dev` mode.  But with `npm run build`, you can kill the server, and the page will still reload.  To then update the site, you'll have to remove the cached site via (in the js console) Application -> Storage -> Clear site data

### Conflict resolution

When the same user is logged into two different browsers and they both go offline, "conflicts" arise when the same document (e.g. todo item) is updated in both browsers in different ways.  When they reconnect, they'll both let the server (Fauna) know about these updates. Should the final state of the document be determined by:
- The browser that came online second?  or
- The browser with the most recent document update?



A tour if the innards


`npx crancos [--ts] [project-name]`

Bootstraps an environment analogous to create-react-app, but with [Snowpack](https://www.snowpack.dev/) and [Tailwind](https://tailwindcss.com)

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


[^1]: My reference.
