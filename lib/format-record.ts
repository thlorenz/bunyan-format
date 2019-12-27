'use strict';

import * as ansicolors from 'ansicolors';
import * as ansistyles from 'ansistyles';
import * as http from 'http';
import * as util from 'util';

let format = util.format;
let styles = { ...ansistyles, ...ansicolors };

// Most of this code is lifted directly from the bunyan ./bin file and should be cleaned up once there is more time

enum OutputMode {
  long = 1,
  json = 2,
  inspect = 3,
  simple = 4,
  short = 5,
  bunyan = 6,
}

// Levels
enum LogLevel {
  TRACE = 10,
  DEBUG = 20,
  INFO = 30,
  WARN = 40,
  ERROR = 50,
  FATAL = 60,
}

let upperNameFromLevel: { [level: string]: string } = {};
let upperPaddedNameFromLevel: { [level: string]: string } = {};

let name: keyof typeof LogLevel;
for (name in LogLevel) {
  const lvl = LogLevel[name];
  upperNameFromLevel[lvl] = name;
  upperPaddedNameFromLevel[lvl] = (name.length === 4 ? ' ' : '') + name;
}

interface BunyanRecord {
  line: number;
  v: any;
  level: LogLevel;
  name: string;
  hostname: string;
  pid: number;
  time: string;
  msg: string;
  component?: any;
  src?: any;
  req_id?: number;
  req?: any; // SoyRequest;
  res?: any;
  client_req?: any;
  client_res?: any;
  err?: Error;
}

/**
 * Is this a valid Bunyan log record.
 */
function isValidRecord(rec: any): rec is BunyanRecord {
  if (rec.v === null ||
    rec.level === null ||
    rec.name === null ||
    rec.hostname === null ||
    rec.pid === null ||
    rec.time === null ||
    rec.msg === null) {
    // Not valid Bunyan log.
    return false;
  } else {
    return true;
  }
}

function indent(s: string): string {
  return '  ' + s.split(/\r?\n/).join('\n  ');
}

function stylizeWithColor(s: string, color: keyof typeof styles) {
  if (!s) {
    return '';
  }
  let fn = styles[color];
  return fn ? fn(s) : s;
}

function stylizeWithoutColor(str: string) {
  return str;
}

/**
 * @param {int} level is the level of the record.
 * @return The level value to its String representation.
 * This is only used on json-related formats output and first suggested at
 * https://github.com/trentm/node-bunyan/issues/194#issuecomment-64858117
 */
function mapLevelToName(level: LogLevel) {
  switch (level) {
    case LogLevel.TRACE:
      return 'TRACE';
    case LogLevel.DEBUG:
      return 'DEBUG';
    case LogLevel.INFO:
      return 'INFO';
    case LogLevel.WARN:
      return 'WARN';
    case LogLevel.ERROR:
      return 'ERROR';
    case LogLevel.FATAL:
      return 'FATAL';
    default:
      return 'UNKNOWN';
  }
}

interface ColorFromLevel {
  [level: number]: keyof typeof styles;
}

export interface FormatRecordOptions {
  outputMode: keyof typeof OutputMode | OutputMode;
  color?: boolean;
  colorFromLevel?: ColorFromLevel;
  levelInString?: boolean;
  jsonIndent?: string | number;
}

/**
 * Print out a single result, considering input options.
 */
export default function formatRecord(rec: any, opts: FormatRecordOptions) {
  let details: string[] = [];

  function _res(res: any) {
    let s = '';
    if (res.header) {
      s += res.header.trimRight();
    } else if (res.headers) {
      if (res.statusCode) {
        s += format(
          'HTTP/1.1 %s %s\n',
          res.statusCode,
          http.STATUS_CODES[res.statusCode]
        );
      }
      let headers = res.headers;
      s += Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join('\n');
    }
    delete res.header;
    delete res.headers;
    delete res.statusCode;
    if (res.body) {
      s += '\n\n' + (typeof (res.body) === 'object'
        ? JSON.stringify(res.body, null, 2) : res.body);
      delete res.body;
    }
    if (res.trailer) {
      s += '\n' + res.trailer;
    }
    delete res.trailer;
    if (s) {
      details.push(indent(s));
    }
    // E.g. for extra 'foo' field on 'res', add 'res.foo' at
    // top-level. This *does* have the potential to stomp on a
    // literal 'res.foo' key.
    for (const k in res) {
      rec['res.' + k] = res[k];
    }
  }

  let short = false;
  let line: number = rec.line;
  let stylize = opts.color ? stylizeWithColor : stylizeWithoutColor;
  let outputMode: OutputMode = typeof opts.outputMode === 'string' ?
    OutputMode[opts.outputMode] :
    opts.outputMode;

  switch (outputMode) {
    case OutputMode.short:
      short = true;
    /* falls through */
    case OutputMode.long:
      //  [time] LEVEL: name[/comp]/pid on hostname (src): msg* (extras...)
      //    msg*
      //    --
      //    long and multi-line extras
      //    ...
      // If 'msg' is single-line, then it goes in the top line.
      // If 'req', show the request.
      // If 'res', show the response.
      // If 'err' and 'err.stack' then show that.
      if (!isValidRecord(rec)) {
        return line + '\n';
      }

      delete rec.v;

      /*
			 * We assume the Date is formatted according to ISO8601, in which
			 * case we can safely chop off the date information.
			 */
      let time: string;
      if (short && rec.time[10] === 'T') {
        time = rec.time.substr(11);
        time = stylize(time, 'brightBlack');
      } else {
        time = stylize(`[${rec.time}]`, 'brightBlack');
      }

      delete rec.time;

      let nameStr = rec.name;
      delete rec.name;

      if (rec.component) {
        nameStr += '/' + rec.component;
      }
      delete rec.component;

      if (!short) {
        nameStr += '/' + rec.pid;
      }
      delete rec.pid;

      let level = (upperPaddedNameFromLevel[rec.level] || 'LVL' + rec.level);
      if (opts.color) {
        let colorFromLevel = opts.colorFromLevel || {
          10: 'brightBlack',   // TRACE
          20: 'brightBlack',   // DEBUG
          30: 'cyan',   // INFO
          40: 'magenta',  // WARN
          50: 'red',    // ERROR
          60: 'inverse',  // FATAL
        };
        level = stylize(level, colorFromLevel[rec.level]);
      }
      delete rec.level;

      let src = '';
      let headers: { [k: string]: string; };
      let hostHeaderLine = '';
      if (rec.src && rec.src.file) {
        const s = rec.src;
        if (s.func) {
          src = format(' (%s:%d in %s)', s.file, s.line, s.func);
        } else {
          src = format(' (%s:%d)', s.file, s.line);
        }
        src = stylize(src, 'green');
      }
      delete rec.src;

      let hostname = rec.hostname;
      delete rec.hostname;

      let extras: string[] = [];

      if (rec.req_id) {
        extras.push('req_id=' + rec.req_id);
      }
      delete rec.req_id;

      let onelineMsg;
      if (rec.msg.indexOf('\n') !== -1) {
        onelineMsg = '';
        details.push(indent(stylize(rec.msg, 'cyan')));
      } else {
        onelineMsg = ' ' + stylize(rec.msg, 'cyan');
      }
      delete rec.msg;

      if (rec.req && typeof (rec.req) === 'object') {
        let req = rec.req;
        delete rec.req;
        headers = req.headers;
        let s = format(
          '%s %s HTTP/%s%s',
          req.method,
          req.url,
          req.httpVersion || '1.1',
          (headers ? '\n' + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join('\n') : '')
        );
        delete req.url;
        delete req.method;
        delete req.httpVersion;
        delete req.headers;
        if (req.body) {
          s += '\n\n' + (typeof (req.body) === 'object'
            ? JSON.stringify(req.body, null, 2) : req.body);
          delete req.body;
        }
        if (req.trailers && Object.keys(req.trailers).length > 0) {
          s += '\n' + Object.keys(req.trailers).map((t) => `${t}: ${req.trailers[t]}`).join('\n');
        }
        delete req.trailers;
        details.push(indent(s));
        // E.g. for extra 'foo' field on 'req', add 'req.foo' at
        // top-level. This *does* have the potential to stomp on a
        // literal 'req.foo' key.
        for (const k in req) {
          rec[`req.${k}`] = req[k];
        }
      }

      if (rec.client_req && typeof (rec.client_req) === 'object') {
        let client_req = rec.client_req;
        delete rec.client_req;
        headers = client_req.headers;
        let s = '';
        if (client_req.address) {
          hostHeaderLine = 'Host: ' + client_req.address;
          if (client_req.port) {
            hostHeaderLine += ':' + client_req.port;
          }
          hostHeaderLine += '\n';
        }
        delete client_req.headers;
        delete client_req.address;
        delete client_req.port;
        s += format(
          '%s %s HTTP/%s\n%s%s', client_req.method,
          client_req.url,
          client_req.httpVersion || '1.1',
          hostHeaderLine,
          (headers ? Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join('\n') : '')
        );
        delete client_req.method;
        delete client_req.url;
        delete client_req.httpVersion;
        if (client_req.body) {
          s += '\n\n' + (typeof (client_req.body) === 'object' ?
            JSON.stringify(client_req.body, null, 2) :
            client_req.body);
          delete client_req.body;
        }
        // E.g. for extra 'foo' field on 'client_req', add
        // 'client_req.foo' at top-level. This *does* have the potential
        // to stomp on a literal 'client_req.foo' key.
        for (const k in client_req) {
          rec[`client_req.${k}`] = client_req[k];
        }
        details.push(indent(s));
      }

      if (rec.res && typeof (rec.res) === 'object') {
        _res(rec.res);
        delete rec.res;
      }
      if (rec.client_res && typeof (rec.client_res) === 'object') {
        _res(rec.client_res);
        delete rec.res;
      }

      if (rec.err && rec.err.stack) {
        details.push(indent(rec.err.stack));
        delete rec.err;
      }

      let leftover = Object.keys(rec);
      for (let i = 0; i < leftover.length; i++) {
        let key = leftover[i];
        let value = rec[key];
        let stringified = false;
        if (typeof (value) !== 'string') {
          value = JSON.stringify(value, null, 2);
          stringified = true;
        }
        if (value.indexOf('\n') !== -1 || value.length > 50) {
          details.push(indent(`${key}: ${value}`));
        }
        else if (!stringified && (value.indexOf(' ') !== -1 || value.length === 0)) {
          extras.push(`${key}=${JSON.stringify(value)}`);
        }
        else {
          extras.push(`${key}=${value}`);
        }
      }

      const extrasStr = stylize(extras.length ? ` (${extras.join(', ')})` : '', 'brightBlack');
      const detailsStr = stylize(details.length ? details.join('\n  --\n') + '\n' : '', 'brightBlack');

      if (!short) {
        return format(
          '%s %s: %s on %s%s:%s%s\n%s',
          time,
          level,
          nameStr,
          hostname || '<no-hostname>',
          src,
          onelineMsg,
          extrasStr,
          detailsStr
        );
      }
      else {
        return format(
          '%s %s %s:%s%s\n%s',
          time,
          level,
          nameStr,
          onelineMsg,
          extrasStr,
          detailsStr
        );
      }
      break;

    case OutputMode.inspect:
      return util.inspect(rec, false, Infinity, true) + '\n';

    case OutputMode.bunyan:
      if (opts.levelInString) {
        rec.level = mapLevelToName(rec.level);
      }
      return JSON.stringify(rec, null, 0) + '\n';

    case OutputMode.json:
      if (opts.levelInString) {
        rec.level = mapLevelToName(rec.level);
      }
      return JSON.stringify(rec, null, opts.jsonIndent) + '\n';

    case OutputMode.simple:
      /* JSSTYLED */
      // <http://logging.apache.org/log4j/1.2/apidocs/org/apache/log4j/SimpleLayout.html>
      if (!isValidRecord(rec)) {
        return line + '\n';
      }
      return format(
        '%s - %s\n',
        upperNameFromLevel[rec.level] || 'LVL' + rec.level,
        rec.msg
      );
    default:
      throw new Error(`unknown output mode: ${opts.outputMode}`);
  }
}
