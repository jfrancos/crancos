import config from "./snowpack-base.config.mjs";

config.plugins = config.plugins.concat([
  "@snowpack/plugin-postcss",
  "@jadex/snowpack-plugin-tailwindcss-jit",
]);
config.devOptions.port = 3000;
config.devOptions.open = "none";

export default config
