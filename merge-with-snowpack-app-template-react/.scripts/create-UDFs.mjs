#!/usr/bin/env node

import dotenv from "dotenv";
import faunadb from "faunadb";

dotenv.config();
const { query: q } = faunadb;
const { FAUNA_SECRET } = process.env;
const client = new faunadb.Client({ secret: FAUNA_SECRET });

const {
  CreateRole,
  CreateFunction,
  CreateIndex,
  CreateCollection,
  Collection,
  GT,
  Query,
  Lambda,
  Equals,
  Match,
  CurrentIdentity,
  Map,
  Select,
  Get,
  If,
  Var,
  Update,
  Merge,
  Range,
  Let,
  Add,
  Create,
  Ref,
  Paginate,
  Exists,
  Function,
  Index,
} = q;

(async () => {
  // need to create ts and id indeces
  // allow id and ts conditional perms (although should just use one for user + ts/ref)
  // set conditional perms for documents

  // check error messages in network for mysteries
  // so ... I think all perms

  const FQL = [
    CreateIndex({
      name: "user_by_magic_id",
      unique: true,
      source: Collection("User"),
      terms: [
        {
          field: ["data", "magic_id"],
        },
      ],
    }),
    CreateIndex({
      name: "user_by_stripe_id",
      unique: true,
      source: Collection("User"),
      terms: [
        {
          field: ["data", "stripe_id"],
        },
      ],
    }),
    CreateIndex({
      name: "ts",
      source: Collection("Document"),
      terms: [
        {
          field: ["data", "owner"],
        },
      ],
      values: [
        {
          field: ["ts"],
        },
        {
          field: ["ref"],
        },
      ],
    }),
    CreateIndex({
      name: "id",
      source: Collection("Document"),
      terms: [
        {
          field: ["data", "owner"],
        },
        {
          field: ["data", "id"],
        },
      ],
    }),
    CreateFunction({
      name: "set",
      role: "server",
      body: Query(
        Lambda(
          "newdocs",
          Foreach(
            Var("newdocs"),
            Lambda(
              "newdoc",
              Let(
                {
                  document: Match(Index("id"), [
                    CurrentIdentity(),
                    Select("id", Var("newdoc")),
                  ]),
                  _: Update(CurrentIdentity(), {}),
                },
                If(
                  Exists(Var("document")),
                  If(
                    GT(
                      Select(["updatedAt"], Var("newdoc")),
                      Select(["data", "updatedAt"], Get(Var("document")))
                    ),
                    Update(Select("ref", Get(Var("document"))), {
                      data: Var("newdoc"),
                    }),
                    null
                  ),
                  Create(Collection("Document"), {
                    data: Merge(Var("newdoc"), { owner: CurrentIdentity() }),
                  })
                )
              )
            )
          )
        )
      ),
    }),
    CrateFunction({
      name: "feed",
      role: "server",
      body: Query(
        Lambda(
          ["id", "ts"],
          Let(
            {
              matches: Paginate(
                Range(
                  Match(Index("ts"), CurrentIdentity()),
                  Add(1, Var("ts")),
                  []
                )
              ),
            },
            {
              hasMoreDocuments: Not(
                IsNull(Select("after", Var("matches"), null))
              ),
              documents: Map(
                Select("data", Var("matches")),
                Lambda(
                  "item",
                  Let(
                    { doc: Get(Select(1, Var("item"))) },
                    Merge(Select("data", Var("doc")), [
                      { ts: Select("ts", Var("doc")) },
                      { owner: null },
                    ])
                  )
                )
              ),
            }
          )
        )
      ),
    }),
    CreateRole({
      name: "document-role",
      privileges: [
        {
          // resource: Ref(Ref('functions'), 'feed'),
          resource: Function("feed"),
          actions: {
            call: true,
          },
        },
        {
          // resource: Ref(Ref('functions'), 'set'),
          resource: Function("set"),
          actions: {
            call: true,
          },
        },
        {
          resource: Collection("User"),
          actions: {
            read: Query(Lambda("ref", Equals(CurrentIdentity(), Var("ref")))),
          },
        },
      ],
      membership: [
        {
          resource: Collection("User"),
        },
      ],
    }),
  ];

  try {
    // Collection can't be used in the same transaction
    // where it's created
    let result = await client.query([
      CreateCollection({
        name: "User",
      }),
      CreateCollection({
        name: "Document",
      }),
    ]);
    console.log(result);
    result = await client.query(FQL);
    console.log(result);
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
  }
})();

// next step upload schema??
