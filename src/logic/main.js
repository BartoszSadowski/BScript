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
        parser.removeErrorListeners('syntaxError');
        parser.addErrorListener({
            syntaxError: (recognizer, offendingSymbol, line, column, msg, err) => {
                const correct = msg.match(/extraneous input '.*' expecting {(.*)}/)[1];
                listener.errors.push(`Linia ${line}:${column} nieoczekiwany znak '${offendingSymbol.text}', oczekiwano symbolu z następującej listy: < ${correct} >`);
            }
        });

        const parseTree = parser.start();
        tree.ParseTreeWalker.DEFAULT.walk(listener, parseTree);
    }
}
