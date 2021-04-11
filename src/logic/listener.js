import BScriptListener from '../grammar/antlrResult/BScriptListener.js';

import Generator from './generator.js';
import {
    headerTypes,
    valueTypes
} from './constants.js';

export default class Listener extends BScriptListener {
    constructor() {
        super();
        this.generator = new Generator();
        this.variables = new Map();
        this.headers = new Set();
        this.errors = [];
    }

    exitStart(ctx) {
        if (this.errors.length === 0) {
            console.log(this.generator.generate());
            return;
        }

        this.errors.forEach(error => console.log(error));
    }

    exitDefine(ctx) {
        let type;
        const ID = ctx.ID().getText();
        if (this.variables.has(ID)) {
            const symbol = ctx.ID().symbol;
            this.errors.push(`Linia: ${symbol.line}, Kolumna: ${symbol.column}. Zmienna o nazwie ${ID}, została wcześniej zadeklarowana.`);
            return;
        }

        if (ctx.definition().FLOAT_DEF()) {
            type = valueTypes.FLOAT;
        }

        if (ctx.definition().INT_DEF()) {
            type = valueTypes.INT;
        }

        this.variables.set(ID, type);
        this.generator.declare(ID, type);
    }

    exitInput(ctx) {
        const ID = ctx.ID().getText();

        this.ensureHeader(headerTypes.INPUT);

        this.generator.scanf(ID);
    }

    exitSet(ctx) {
        const ID = ctx.ID().getText();
        const value = this.convertExpresion(ctx.expr());

        this.generator.set(ID, value);
    }

    exitOut(ctx) {
        const value = this.convertExpresion(ctx.expr());

        this.ensureHeader(headerTypes.OUTPUT);

        this.generator.out(value);
    }

    ensureHeader(type) {
        if (!this.headers.has(type)) {
            this.headers.add(type);
            this.generator.addHeader(type);
        }
    }

    convertExpresion(node) {
        if (node.ADD && node.ADD()) {
            const [statement1, statement2] = node.expr();
            const val1 = this.convertExpresion(statement1);
            const val2 = this.convertExpresion(statement2);
            
            return this.generator.addValues(val1, val2);
        }

        if (node.SUB && node.SUB()) {
            const [statement1, statement2] = node.expr();
            const val1 = this.convertExpresion(statement1);
            const val2 = this.convertExpresion(statement2);

            return this.generator.subValues(val1, val2);
        }

        if (node.MUL && node.MUL()) {
            const [statement1, statement2] = node.expr();
            const val1 = this.convertExpresion(statement1);
            const val2 = this.convertExpresion(statement2);
            
            return this.generator.mulValues(val1, val2);
        }

        if (node.DIV && node.DIV()) {
            const [statement1, statement2] = node.expr();
            const val1 = this.convertExpresion(statement1);
            const val2 = this.convertExpresion(statement2);

            return this.generator.divValues(val1, val2);
        }

        if (node.value && node.value()) {
            return this.convertValue(node.value());
        }

        if (node.OP_BRACKETS && node.OP_BRACKETS()) {
            return this.convertExpresion(node.expr()[0]);
        }
    }

    convertValue(node) {
        if (node.ID()) {
            const id = node.ID().getText();

            const value = this.generator.readVar(`%${id}`);


            return {
                isVar: true,
                type: valueTypes.INT,
                value
            }
        }

        if (node.FLOAT()) {
            const value = node.FLOAT().getText();
            console.log(value);

            return {
                isVar: false,
                type: valueTypes.FLOAT,
                value
            };
        }

        if (node.INT()) {
            const value = node.INT().getText();

            return {
                isVar: false,
                type: valueTypes.INT,
                value
            };
        }
    }
}
