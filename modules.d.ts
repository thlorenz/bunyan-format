
declare module 'ansistyles' {
	type AnsiStylizer = (str: string) => string;

	interface AnsiStyles {
		reset    : AnsiStylizer;
		bright   : AnsiStylizer;
		dim      : AnsiStylizer;
		italic   : AnsiStylizer;
		underline: AnsiStylizer;
		blink    : AnsiStylizer;
		inverse  : AnsiStylizer;
	}

	const styles: AnsiStyles;
	export = styles;
}

declare module 'ansicolors' {
	type AnsiColorizer = (str: string) => string;

	interface AnsiColor {
		white         : AnsiColorizer;
		black         : AnsiColorizer;
		blue          : AnsiColorizer;
		cyan          : AnsiColorizer;
		green         : AnsiColorizer;
		magenta       : AnsiColorizer;
		red           : AnsiColorizer;
		yellow        : AnsiColorizer;
		brightBlack   : AnsiColorizer;
		brightRed     : AnsiColorizer;
		brightGreen   : AnsiColorizer;
		brightYellow  : AnsiColorizer;
		brightBlue    : AnsiColorizer;
		brightMagenta : AnsiColorizer;
		brightCyan    : AnsiColorizer;
		brightWhite   : AnsiColorizer;
		bgBlack         : AnsiColorizer;
		bgRed           : AnsiColorizer;
		bgGreen         : AnsiColorizer;
		bgYellow        : AnsiColorizer;
		bgBlue          : AnsiColorizer;
		bgMagenta       : AnsiColorizer;
		bgCyan          : AnsiColorizer;
		bgWhite         : AnsiColorizer;
		bgBrightBlack   : AnsiColorizer;
		bgBrightRed     : AnsiColorizer;
		bgBrightGreen   : AnsiColorizer;
		bgBrightYellow  : AnsiColorizer;
		bgBrightBlue    : AnsiColorizer;
		bgBrightMagenta : AnsiColorizer;
		bgBrightCyan    : AnsiColorizer;
		bgBrightWhite   : AnsiColorizer;
	}

	const styles: AnsiColor;
	export = styles;
}
