# bunyan-format [![build status](https://secure.travis-ci.org/thlorenz/bunyan-format.png)](http://travis-ci.org/thlorenz/bunyan-format)

Writable stream that formats bunyan records that are piped into it

```js
var bunyan = require('bunyan')
  , bformat = require('bunyan-format')  
  , formatOut = bformat({ outputMode: 'short' })
  ;

var log = bunyan.createLogger({ name: 'app', stream: formatOut, level: 'debug' } );

log.info('starting up');
log.debug('things are heating up', { temperature: 80, status: { started: 'yes', overheated: 'no' } });
log.warn('getting a bit hot', { temperature: 120 });
log.error('OOOOHHH it burns!', new Error('temperature: 200'));
log.fatal('I died! Do you know what that means???');
```

![demo](https://github.com/thlorenz/bunyan-format/raw/master/assets/bunyan-format-demo.gif)

## Installation

    npm install bunyan-format

## API

```
/**
 * Creates a writable stream that formats bunyan records written to it.
 * 
 * @name BunyanFormatWritable
 * @function
 * @param opts {Options} passed to bunyan format function
 *  - outputMode: short|long|simple|json|bunyan
 *  - color (true): toggles colors in output
 *  - colorFromLevel: allows overriding log level colors
 * @param out {Stream} (process.stdout) writable stream to write 
 * @return {WritableStream} that you can pipe bunyan output into
 */
```

## License

MIT
