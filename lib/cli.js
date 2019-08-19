'use strict';

const program = require('commander');

// returns array of args from conf file, or empty array if no conf file.
// TODO document
// TODO determine load order
// TODO need option to specify conf file, and option to not load conf file. Both
// can be same option in commander.
const loadConfFile = async (location = './') => {
  // if we want to search upwards for the conf file at some level, find-up is a
  // good method here.
  // TODO stat for file in this dir
  // TODO stat for file in home
  // TODO load if found
  return [];
};

const parseArgs = async (args) => {
  if (!args.includes('--no-rc')) {
    args = [...(await loadConfFile()), ...args];
  }

  let rootDir = './';

  program
    .version(require('../package.json').version)
    .option('-p, --port <port>', 'Port to use. If not specified, searches for an open port starting from 8080')
    .option('-a, --address <address>', 'Address to serve from', '0.0.0.0')
    .option('--no-directory-listing', 'Show directory listings')
    .option('--no-auto-index', 'Display autoIndex') // TODO better description
    .option('-g, --gzip', 'Serve gzip files when possible')
    .option('-b, --brotli', 'Serve brotli files when possible. If both brotli and gzip are enabled, brotli takes precedence when applicable')
    .option('-e, --ext', 'Default file extension if request does not specify', 'html')
    .option('-s, --silent', 'Suppress log message output')
    .option('--cors [corsHeaders]', 'Enable CORS via the "Access-Control-Allow_Origin" header. Optionally provide CORS headers list separated by commas')
    .option('-o, --open-browser [url]', 'Open default browser window after starting the server. Optionally provide a URL to open the window to')
    .option('-c, --cache-time <seconds>', 'Cache time (max-age) in seconds. To disable caching, use -1.', 3600)
    .option('-U, --utc', 'Use UTC time format in log message output')
    .option('--log-ip', 'Enable logging of the client\'s IP address')
    .option('-P, --proxy <proxy>', 'Fallback proxy if the request cannot be resolved')
    .option('--username <username>', 'Username for basic authentication. Can also be specified with the environment variable NODE_HTTP_SERVER_USERNAME')
    .option('--password <password>', 'Password for basic authentication. Can also be specified with the env variable NODE_HTTP_SERVER_PASSWORD')
    .option('--tls', 'Enable HTTPS')
    .option('-S, --ssl', 'Synonym for --tls')
    .option('-C, --cert <path>', 'Path to TLS certificate file')
    .option('-K, --key <path>', 'Path to TLS key file')
    .option('-r, --robots <robotsString>', 'String to respond to a request for /robots.txt without the need for an actual /robots.txt', 'User-agent: *\\nDisallow: /')
    .option('--no-dotfiles', 'Do not display dotfiles')
    .arguments('[rootDir]')
    .action((rootOpt) => {
      if (rootOpt) rootDir = rootOpt;
    });

  program.parse(args);
  program.rootDir = rootDir;
  return program;
};

const generateServerConfig = async (args, logger) => {
  const prog = await parseArgs(args);

  return {
    logFn: logger.request,
    root: prog.rootDir,
    cache: prog.cache,
    showDir: prog.directoryListing,
    autoIndex: prog.autoIndex,
    gzip: prog.gzip,
    brotli: prog.brotli,
    robots: prog.robots,
    ext: prog.ext,
    proxy: prog.proxy,
    showDotfiles: prog.dotfiles,
    username: prog.username || process.env.NODE_HTTP_SERVER_USERNAME,
    password: prog.password || process.env.NODE_HTTP_SERVER_PASSWORD,
    cors: !!prog.cors,
    corsHeaders: (typeof prog.cors === 'string') ? prog.cors : undefined,
    https: prog.tls || prog.ssl ? {cert: prog.cert || 'cert.pem', key: prog.key || 'key.pem'} : undefined,
  };
};

const logServerStart = () => {
  const canonicalHost
};
