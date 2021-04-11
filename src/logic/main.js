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

        const listener = new Listener();
        parser.removeErrorListeners();
        parser.addErrorListener({
            syntaxError: (recognizer, offendingSymbol, line, column, msg, err) => {
                const expected = msg.match(/extraneous input '.*' expecting {(.*)}/);
                const correct = (expected && expected.length > 1) ? `, oczekiwano symbolu z następującej listy: < ${correct} >` : '';
                listener.errors.push(`Linia ${line}:${column} nieoczekiwany znak '${offendingSymbol.text}'${correct}`);
            }
        });

        const parseTree = parser.start();
        tree.ParseTreeWalker.DEFAULT.walk(listener, parseTree);
    }
}
