import { Writable, WritableOptions } from 'stream';
import formatRecord, { FormatRecordOptions } from './lib/format-record';

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
class BunyanFormatWritable extends Writable {
  public static readonly default = BunyanFormatWritable;

  private readonly opts: Options;
  private out: NodeJS.WritableStream;

  constructor(opts?: Options, out?: NodeJS.WritableStream) {
    // @ts-ignore
    if (!(this instanceof BunyanFormatWritable)) {
      return new BunyanFormatWritable(opts, out);
    }

    const innerOptions: Partial<Options> = opts || {};
    innerOptions.objectMode = true;
    super(innerOptions);

    this.opts = {
      outputMode: 'short',
      color: true,
      colorFromLevel: {
        10: 'brightBlack',    // TRACE
        20: 'brightBlack',    // DEBUG
        30: 'green',          // INFO
        40: 'magenta',        // WARN
        50: 'red',            // ERROR
        60: 'brightRed',      // FATAL
      },
      ...innerOptions
    };
    this.out = out || process.stdout;
  }

  public _write(chunk: any, _encoding: string, cb: (error?: Error) => void) {
    try {
      const rec = JSON.parse(chunk);
      this.out.write(formatRecord(rec, this.opts));
    }
    catch (e) {
      this.out.write(chunk);
    }
    cb();
  }
}

interface Options extends FormatRecordOptions, WritableOptions {
}

declare namespace BunyanFormatWritable {
  type BunyanFormatOptions = Options;
}

export = BunyanFormatWritable;
