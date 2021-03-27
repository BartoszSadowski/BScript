import {
    InputStream,
    CommonTokenStream
} from 'antlr4';

import BScriptLexer from '../grammar/antlrResult/BScriptLexer.js';
import BScriptParser from '../grammar/antlrResult/BScriptParser.js';

import Visitor from './visitor.js';

export default class Main {
    constructor(code) {
        const codeStream = new InputStream(code);
        const lexer = new BScriptLexer(codeStream);
        const tokens = new CommonTokenStream(lexer);
        const parser = new BScriptParser(tokens);
        const tree = parser.start();
        tree.accept(new Visitor);
    }
}
