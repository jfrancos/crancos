import { Magic, RPCError } from 'magic-sdk';

const { MAGIC_PUBLISHABLE_KEY } = import.meta.env;
let magic;

if (MAGIC_PUBLISHABLE_KEY) {
  magic = new Magic(MAGIC_PUBLISHABLE_KEY, { testMode: false });
}

export  { magic, RPCError };
