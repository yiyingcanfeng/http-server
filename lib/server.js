'use strict';

const fs = require('fs').promises;
const auth = require('basic-auth');
const secureCompare = require('secure-compare');
const corser = require('corser');
const httpProxy = require('http-proxy');
const ecstatic = require('./ecstatic.js');
const union = require('union');

// TODO pull union into this dir
// TODO replace union

class HttpServer {
  constructor(opts) {
    this.config = opts;
    this.options = {};
    this.server = this.createServer();
  }

  set config(opts) {
    this._config = {
      ...opts,
      handleError: typeof opts.proxy !== 'string'
    };
  }
  get config() {return this._config;}
  get options() {
    return {
      before: this.createBefore,
      headers: this.config.headers,
      onError: this.errorFn,
      https: this.config.https,
    };
  }

  createServer() {
    return union.createServer(this.options);
  }

  listen() {
    this.server.listen.apply(this.server, arguments);
  }

  close() {
    return this.server.close();
  }

  logFn() {
    if (this.config.logFn) {
      this.config.logFn(...arguments);
    }
  }

  errorFn(req, res, err) {
    this.logFn(req, res, err);
    res.end();
  }

  async init() {
    this.config.root = await this.getRootPath();
    this.config.cache = this.getCacheString();
    this.before = this.createBefore();
  }

  async getRootPath() {
    if (this.config.root) return this.config.root;
    try {
      await fs.lstat('./public');
      return './public';
    } catch (err) {
      return './';
    }
  }

  getCacheString() {
    // If the cache option is -1, caching is turned off aggressively
    if (this.config.cache === -1) {
      return 'no-cache, no-store, must-revalidate';
    }
    return this.config.cache;
  }

  basicAuthHandler(username, password) {
    return (req, res) => {
      const creds = auth(req);
      if (creds) {
        // We check these individually before the if statement to avoid a
        // short-circuit timing vulnerability.
        const usernameEqual = secureCompare(username, creds.name);
        const passwordEqual = secureCompare(password, creds.pass);
        if (usernameEqual && passwordEqual) {
          return res.emit('next');
        }
      }

      res.statusCode = 401;
      res.setHeader('WWW-Authenticate', 'Basic realm=""');
      res.end('Access denied');
      return null;
    };
  }

  headersFromCorsHeaders(corsHeaders) {
    const headers = {};

    headers['Access-Control-Allow-Origin'] = '*';
    headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Range';

    if (corsHeaders) {
      corsHeaders.split(/\s*,\s*/).forEach((h) => {
        headers['Access-Control-Allow-Headers'] += `, ${h}`;
      });
    }

    return headers;
  }

  corsHandler(headers, corsHeaders) {
    const corserHeaders = corsHeaders
          ? {requestHeaders: headers['Access-Control-Allow-Headers'].split(/\s*,\s*/)}
          : null;

    return corser.create(corserHeaders);
  }

  robotsHandler(robotOption) {
    return (req, res) => {
      if (req.url === '/robots.txt') {
        res.setHeader('Content-Type', 'text/plain');
        const robots = robotOption
              ? 'User-agent: *\nDisallow: /'
              : robotOption.replace(/\\n/, '\n');

        return res.end(robots);
      }

      res.emit('next');
      return null;
    };
  }

  makeProxyFunArray() {
    const proxy = httpProxy.createProxyServer({});
    return [(req, res) => {
      proxy.web(
        req,
        res,
        {target: this.config.proxy, changeOrigin: true},
        (err, req, res, target) => {
          this.config.logFn(req, res, {
            message: err.message,
            status: res.statusCode,
          });
          res.emit('next');
        });
    }];
  }

  createBefore() {
    const before = this.config.before
      ? this.config.before.slice()
      : [];

    const basicAuth = this.basicAuthHandler(
      this.config.username,
      this.config.password
    );
    if (this.config.username || this.config.password) {
      before.push(basicAuth);
    }

    if (this.config.cors) {
      this.headers = this.headersFromCorsHeaders(this.config.corsHeaders);
      before.push(this.corsHandler(this.headers, this.config.corsHeaders));
    }

    if (this.config.robots) {
      before.push(this.robotsHandler());
    }

    before.push(ecstatic(this.config));

    if (typeof this.config.proxy === 'string') {
      before.push(...this.makeProxyFunArray());
    }
  }
}

exports = {
  createServer: (opts) => new HttpServer(opts),
  HttpServer,
};
