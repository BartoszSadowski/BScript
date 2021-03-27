import {
    InputStream,
    CommonTokenStream,
    tree
} from 'antlr4';

import BScriptLexer from '../grammar/antlrResult/BScriptLexer.js';
import BScriptParser from '../grammar/antlrResult/BScriptParser.js';

import Listener from './listener.js';

export default class Main {
    constructor(code) {
        const codeStream = new InputStream(code);
        const lexer = new BScriptLexer(codeStream);
        const tokens = new CommonTokenStream(lexer);
        const parser = new BScriptParser(tokens);
        const parseTree = parser.start();
        const listener = new Listener();
        tree.ParseTreeWalker.DEFAULT.walk(listener, parseTree);
    }
}
