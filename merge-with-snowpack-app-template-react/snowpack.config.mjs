import config from './snowpack-base.config.mjs';

config.plugins = config.plugins.concat(['@snowpack/plugin-postcss']);
config.devOptions.port = 3000;
config.devOptions.open = 'none';
config.devOptions.hostname = 'dev.localhost';
config.env = { MAGIC_PUBLISHABLE_KEY: '' };
export default config;
