import util from 'util';
import { Expression, JSXElement, Statement } from '@babel/types';
import { Babel } from './types';

const parseMethodOpts = {
    plugins: ['@babel/plugin-syntax-jsx']
};
const elementPatterns = [
    /^<>.+<\/>$/, // React fragments: <>{...}</>
    /<.+\/\s*>$/, // Self-closing tags: <foo{...}/>
    /^<([^\s>]+).+<\/\1>$/ // Tags that open and close: <foo{...}>{...}</foo>
];
const openingElementPattern = /^<.+>$/;
export default class JSXSnippetParser {
    private readonly _filename: string;
    // @ts-ignore
    private readonly _babel: Babel;

    get config() {
        return {
            ...parseMethodOpts,
            filename: this._filename
        };
    }

    constructor(babelInstance: Babel, filename: string) {
        this._babel = babelInstance;
        this._filename = filename;
    }

    normalizeElement(jsxSnippet: string) {
        const formatted = jsxSnippet.trim();
        if (elementPatterns.some(pattern => pattern.test(formatted))) {
            return formatted;
        }
        // turn an opening element, like `<Foo>`, into a self-closing one
        if (openingElementPattern.test(formatted)) {
            return formatted.slice(0, formatted.length - 1) + ' />';
        }

        // or just make it a self-closing JSX element already!
        return `<${formatted} />`;
    }

    parseAttributes(attributesEntries: [string, unknown][]) {
        const attrSources = [];
        // iteration instead of Array.map because we may receive any iterable
        for (const [name, value] of attributesEntries) {
            // boolean true just sets the attribute as present
            attrSources.push(value === true ? name : `${name}=${value}`);
        }

        return this.parseElement(`<X ${attrSources.join(' ')} />`).openingElement.attributes;
    }

    parseElement(jsxSnippet: string) {
        try {
            const jsxNode = this.parseExpression(jsxSnippet);
            if (!this._babel.types.isJSXFragment(jsxNode)) {
                // @ts-ignore will throw when not a JSXElement
                this._babel.types.assertJSXElement(jsxNode);
            }
            return jsxNode as JSXElement;
        } catch (e) {
            // @ts-ignore
            throw new Error(`Provided JSX fragment does not parse as a valid JSX Element: ${jsxSnippet}: ${e.toString()}`);
        }
    }

    parseExpression(expr: string) {
        const program = this.parseProgram(expr);
        const { body, directives } = program;
        if (body.length === 0 && directives.length === 1) {
            // it was a string literal
            return this._babel.types.stringLiteral(JSON.parse(expr));
        }
        if (!(body && body[0] && hasExpression(body[0]))) {
            throw new Error(
                `No code expression found in ${expr}` +
                util.inspect(program)
            );
        }
        return body[0].expression as Expression;
    }

    private parseProgram(expr: string) {
        const ast = this._babel.parseSync(expr, this.config);
        if (!ast) {
            throw new Error(
                `Got null result from parsing ${expr}`
            );
        }
        return ast?.type === 'Program' ? ast : ast?.program;
    }
}


// @ts-ignore
const hasExpression = (statement: Statement): statement is Extract<Statement, { expression: Expression }> => statement.expression;
