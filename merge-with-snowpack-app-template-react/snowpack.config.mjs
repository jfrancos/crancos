// Amending this way in order to preserve above comments
module.exports.plugins = module.exports.plugins.concat([
  "@snowpack/plugin-postcss",
  "@jadex/snowpack-plugin-tailwindcss-jit",
]);
module.exports.devOptions.port = 3000;
module.exports.devOptions.open = "none";
