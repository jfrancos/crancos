## Reactive[1], offline-first per-user documents out of the box with [Fauna](https://fauna.com) and [Magic](https://magic.link)

### Have a demo up and running in under five minutes

This is a CRA-style template you can use to create reactive[1] offline-first per-user-document-based apps.  To achieve this, I've integrated:
- [RxDB](https://rxdb.info/) (browser-based NoSQL database with PouchDB under the hood)
- [FaunaDB](https://fauna.com/) (cloud data storage)
- [Magic](https://magic.link/) (passwordless auth and session management)
- [An npm run script](https://github.com/jfrancos/crancos/blob/main/merge-with-snowpack-app-template-react/.scripts/create-UDFs.mjs) that implements [RxDB's GraphQL replication plugin requirements](https://rxdb.info/replication-graphql.html) via [FQL](https://docs.fauna.com/fauna/current/api/fql/cheat_sheet)
- A custom `useCollection` hook that exposes an RxDB collection and a reactive[2] query

Also out-of-the-box:
- [Snowpack](https://www.snowpack.dev/) (frontend build)
- [Tailwind](https://tailwind.dev/) (utility-first CSS)
- [React](https://reactjs.org/) (user interface)
- Bonus!  A demo TODO app

[1]: Reactive as in, updates to user documents in one browser will be immediately reflected in all other browsers where the same user is logged in, via Fauna's streaming

[2]: Reactive as in, changes to the state of the local RxDB database will be reflected in the hook variable and cause a rerender

## Try it out

0. You have a text editor such as [VS Code](https://code.visualstudio.com/download), and accounts at [fauna.com](https://dashboard.fauna.com/accounts/register) and [magic.link](https://dashboard.magic.link/signup)
1. `npx crancos [your-project]`
   - You can do steps (2) and (3) while (1) is running
2. Get public and private keys from [magic.link](https://dashboard.magic.link/app/all_apps)
      - "All Apps" -> "New App"
      - Choose a name
      - Save
3. Get a private key from [fauna](https://dashboard.fauna.com/)
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
6. `npm run provision-fauna`
7. `npm run dev`

(continued after video)

Chrome on the left, [Brave](https://brave.com/) on the right:

https://user-images.githubusercontent.com/14883673/135511514-24bbac6e-93b5-4c55-b9da-5693bb170311.mp4

8. Replace the contents of `Controller.jsx` with your own very special time-managmentment app, video game, or other user-document-based app:
    
    In the custom hook `const [collection, tasks] = useCollection('documents');`
    
    - `collection` here is an [RxDB Collection](https://rxdb.info/rx-collection.html)
    
    - `tasks` here is an [observed query](https://rxdb.info/rx-query.html#observe-) that returns all documents sorted by creation time
      - It would be nice to define the query as a parameter to the hook -- as it is, it's defined within the hooks definition in `Database.jsx` (one reason I am calling this a "proof of concept")

### Kinds of offline-first

- **User data** is offline-first via RxDB.  This works automatically in both `dev` and `build` (`npm run build`) modes.
- **The static site itself** is offline-first via [workbox](https://developers.google.com/web/tools/workbox/modules/workbox-cli).  This doesn't work in `dev` mode.  But with `npm run build`, you can kill the server, and the page will still reload.  To then update the site, you'll have to remove the cached site via Developer Tools -> Application -> Storage -> Clear site data

### Conflict resolution

When the same user is logged into two different browsers and they both go offline, "conflicts" arise when the same document (e.g. a todo item) is updated in both browsers in different ways.  When they reconnect, they'll both let the server (Fauna) know about these updates, and only one of these versions can "win". Should the final state of the document be determined by:
- The browser that came online most recently?  or
- The browser with the most recent document update?

There's no automatic answer, but I think the latter is the better default, and that's how I've setup the FQL.
In addition, _deletion_ is a quality of a document (this is per RxDB's replication spec).  Thus documents removed are never actually deleted from the server, they just get a `deleted: true` property (this is necessary to properly sync deleted documents when offline devices come online).

### Schema

The goal here is schemaless if possible, but at the moment there are two schemas going on here: one in Fauna's GraphQL interface, and one in RxDB's interface.  I've setup a generic schema with `booleanData`, `numberData`, and `stringData`.  To update it, you'll have to adjust:

- `schema` and `pullQueryBuilder` in `Documents.jsx`, 
- `Document` and `DocumentInput` in `schema.gql`

before doing `npm run provision-fauna` (note to self: make it easy to reprovision).  I know, it's a drag.  You may also need to purge application data with Developer Tools -> Application -> Storage -> Clear site data

### This is a "proof of concept", not a release

There is still a lot to do here.  Priorities at the moment:
- Schemaless.  Right now Fauna/GraphQL needs to know about a schema, as well as RxDB, and this seems unnecessary, especially since you're not directly using GraphQL to retrieve or manipulate data.  I have two main ideas here:
   - Adapt RxDB's [CouchDB replication plugin](https://github.com/pubkey/rxdb/blob/master/src/plugins/replication-couchdb.ts) to FQL and tell RxDB we're using any old object
   - Instead of using RxDB, create something from scratch that has an interface similar to [useArray](https://github.com/kitze/react-hanger/blob/master/README-ARRAY.md#usearray) and implements replication similar to CouchDB
- Include manifest to make a full PWA out of the box
- There are a lot of parts to this project, and maybe e.g. RxDB/Document.jsx should be its own package
- Add some kind of automated [Stripe](https://stripe.com/) setup
- Arbitrary document ordering, perhaps with [mudderjs](https://github.com/fasiha/mudderjs)?
- Convert to TypeScript
- Testing

Some other things I think about include:
- I'm curious about [gun.js](https://github.com/amark/gun) and [automerge](https://github.com/automerge/automerge), and how they might integrate with Fauna
- Will local RxDB updates be too slow in some settings, and if so would [react-query](https://github.com/tannerlinsley/react-query) or [swr](https://github.com/vercel/swr) be helpful
- If there were a "log out all other sessions" button, would it make sense for that to also purge deleted documents?
- How can the npx command complete more quickly?

Misc:

NB Life is short so `./src/index.css` has
```
div {
  display: flex;
}
```
(a personal preference that should probably be extracted into a separate package)
