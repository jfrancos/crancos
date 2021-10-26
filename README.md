## Reactive[1], offline-first per-user documents out of the box with [Fauna](https://fauna.com) and [Magic](https://magic.link)

### Have a demo up and running in under five minutes

This is a CRA-style template you can use to create reactive[1] offline-first per-user-document-based apps. To achieve this, I've integrated:
- [RxDB](https://rxdb.info/) (browser-based NoSQL database with PouchDB under the hood)
- [Fauna](https://fauna.com/) (cloud data storage)
- [Magic](https://magic.link/) (passwordless auth and session management)
- [An npm run script](https://github.com/jfrancos/crancos/blob/main/merge-with-snowpack-app-template-react/.scripts/create-UDFs.mjs) that implements [RxDB's replication plugin requirements](https://rxdb.info/replication.html) via [FQL](https://docs.fauna.com/fauna/current/api/fql/cheat_sheet)
- A custom `useCollection` hook that exposes an [RxDB collection](https://rxdb.info/rx-collection.html) and any number of reactive[2] queries ([usage below](https://github.com/jfrancos/crancos#usecollection-usage)):

```
const [collection, [query-result1, query-result2, ...]] = useCollection(
  collection-name,
  [mongo-style-query1, mongo-style-query2, ...],
  [index1, index2, ...]
)
```

Also out-of-the-box:

- [Snowpack](https://www.snowpack.dev/) (frontend build)
- [React](https://reactjs.org/) (user interface)
- [Tailwind](https://tailwind.dev/) (utility-first CSS)
- [Stripe](https://stripe.com/) (accept and update subscription payments)
- Bonus! A demo TODO app

[1]: Reactive as in, updates to user documents in one browser will be immediately reflected in all other browsers where the same user is logged in, via Fauna's streaming

[2]: Reactive as in, changes to the state of the local RxDB database will be reflected in the hook variable and cause a rerender

## Try it out

(If you get an error about accessing `uv_cwd` with the `npm run` scripts below, [please see this](http://kb.yworks.com/article/784/Installation-Issue-on-macOS---EPERM-operation-not-permitted-uvcwd))

0. You have accounts at [fauna.com](https://dashboard.fauna.com/accounts/register), [magic.link](https://dashboard.magic.link/signup), and [stripe.com](https://dashboard.stripe.com/register)
1. `npx @jfrancos/crancos [your-project]`
   - You can do steps (2), (3), and (4) while (1) is running
2. Get public and private keys from [Magic](https://dashboard.magic.link/app/all_apps)
   - "All Apps" -> "New App"
   - Choose a name
   - Save
3. Get a private key from [Fauna](https://dashboard.fauna.com/)
   - "CREATE DATABASE"
     - Choose a name
     - Any Region Group is fine, "Classic" is a good default
     - CREATE
   - Security -> NEW KEY -> SAVE (use defaults)
4. Get a private key from [Stripe](https://dashboard.stripe.com/test/developers)
   - Top-left: New account
   - Bottom-right: Secret key
5. Put your public magic key into `snowpack.config.mjs`:
   ```
   ...
   config.env = { MAGIC_PUBLISHABLE_KEY: 'pk_live_...' };`
   ...
   ```
6. Put your private Magic, Fauna and Stripe keys into `.env`:
   ```
   MAGIC_SECRET=sk_live_...
   FAUNA_SECRET=fn...
   STRIPE_SECRET=sk_test_...
   ```
7. `npm run provision-fauna`
8. `npm run provision-stripe`
9. `npm run dev`
10. (in a second terminal) `npm run ngrok` (auto-tunnel for your stripe endpoint)

(continued after video)

Chrome on the left, [Brave](https://brave.com/) on the right:

https://user-images.githubusercontent.com/14883673/135511514-24bbac6e-93b5-4c55-b9da-5693bb170311.mp4

11. Replace the contents of `Controller.jsx` with your own very special time-managmentment app, video game, or other user-document-based app.


## `useCollection` usage

```
import { useCollection } from './lib/ReplicatedCollection';

const [collection, [query-result1, query-result2, ...]] = useCollection(
  collection-name,
  [mongo-style-query1, mongo-style-query2, ...],
  [index1, index2, ...]
)
```

 - `collection` is an [RxDB Collection](https://rxdb.info/rx-collection.html) with which you can e.g. `insert` and `remove` documents.

 - `query-results` are the results of [mongo-style-queries](https://github.com/cloudant/mango#find) that are [kept up-to-date](https://rxdb.info/rx-query.html#observe-) as the collection and its documents are updated.
   
 - `collection-name` will become the name of the underlying RxDB/pouchdb collection.  You can use multiple collections and have them replicated, if you give them different names.

 - `mongo-style-queries` follow the structure defined [here](https://github.com/cloudant/mango#find), i.e. these are objects with a mandatory `selector` and optional `limit`, `skip`, `sort` etc.  See [`Controller.jsx`](https://github.com/jfrancos/crancos/blob/main/merge-with-snowpack-app-template-react/src/Controller.jsx) for a couple examples.

- `indices`: It's good to create an index for any data you're searching or sorting over.  Data stored using `useCollection` is schemaless from our point of view, with all data stored in the document's `data` object, thus you should prefix indices accordingly e.g. `"data.title"`.  RxDB will not always complain when you search for something that doesn't have an index, so if you want to be sure, uncomment the following two lines in the `_create` function of `src/lib/Collection.jsx` and look for `pouchdb:find query plan` in your browsers' js console:
  ```
  // addPouchPlugin(pouchdbDebug);
  // PouchDB.debug.enable('pouchdb:find');
  ```


### Schema(less)

The underlying RxDB collections have a schema, but from the `useCollection` user's point of view, this setup is schemaless - just make sure all your data is stored inside the `data` object e.g.:
```
collection.insert({
  data: {
    completed: false,
    title: inputValue,
  }
});
```


### Kinds of offline-first

- **User data** is offline-first via RxDB.  This works automatically in both `dev` and `build` (`npm run build`) modes.
- **The static site itself** is offline-first via [workbox](https://developers.google.com/web/tools/workbox/modules/workbox-cli).  This doesn't work in `dev` mode.  But with `npm run build`, you can kill the server, and the page will still reload.  To then update the site, you'll have to remove the cached site via Developer Tools -> Application -> Storage -> Clear site data

### Conflict resolution

When the same user is logged into two different browsers and they both go offline, "conflicts" arise when the same document (e.g. a todo item) is updated in both browsers in different ways.  When they reconnect, they'll both let the server (Fauna) know about these updates, and only one of these versions can "win". Should the final state of the document be determined by:
- The browser that came online most recently?  or
- The browser with the most recent document update?

There's no automatic answer, but I think the latter is the better default, and that's how I've setup the replication logic.
In addition, _deletion_ is a quality of a document (this is per RxDB's replication spec).  Thus documents removed are never actually deleted from the server, they just get a `deleted: true` property (this is necessary to properly sync deleted documents when offline devices come online).

### Stripe plans

To update your stripe plans, see [`add-stripe.mjs`](https://github.com/jfrancos/crancos/blob/main/merge-with-snowpack-app-template-react/.scripts/add-stripe.mjs)

### This is a "proof of concept", not a release

There is still a lot to do here.  Priorities at the moment:
- Storing one-off user-data in the main user document (in Fauna), accessible also via RxDB
- Include manifest to make a full PWA out of the box
- There are a lot of parts to this project, and maybe e.g. RxDB/Collection.jsx etc. should be its own package
- Arbitrary document ordering, perhaps with [mudderjs](https://github.com/fasiha/mudderjs)?
- Convert to TypeScript
- Testing
- ~~Schemaless.  Right now Fauna/GraphQL needs to know about a schema, as well as RxDB, and this seems unnecessary, especially since you're not directly using GraphQL to retrieve or manipulate data.~~ ✅
- ~~Adapt RxDB's [CouchDB replication plugin](https://github.com/pubkey/rxdb/blob/master/src/plugins/replication-couchdb.ts) to FQL and tell RxDB we're using any old object~~ ✅ (using RxDB's recent primitives replication)
- ~~Add some kind of automated Stripe setup~~ ✅


Some other things I think about include:
- I'm curious about [gun.js](https://github.com/amark/gun) and [automerge](https://github.com/automerge/automerge), and how they might integrate with Fauna
- Will local RxDB updates be too slow in some settings, and if so would [react-query](https://github.com/tannerlinsley/react-query) or [swr](https://github.com/vercel/swr) be helpful
- If there were a "log out all other sessions" button, would it make sense for that to also purge deleted documents?
- How can the npx command complete more quickly?

Misc:

`./src/index.css` has
```

div {
  display: flex;
}

```
(a personal preference that should probably be extracted into a separate package)
