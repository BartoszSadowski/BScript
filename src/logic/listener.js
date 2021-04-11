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
        this.variables = new Set();
        this.headers = new Set();
    }

    exitStart(ctx) {
        console.log(this.generator.generate());
    }

    exitInput(ctx) {
        const ID = ctx.ID().getText();

        this.ensureVariable(ID);
        this.ensureHeader(headerTypes.INPUT);

        this.generator.scanf(ID);
    }

    exitSet(ctx) {
        const ID = ctx.ID().getText();
        const value = this.convertExpresion(ctx.expr());

        this.ensureVariable(ID);

        this.generator.set(ID, value);
    }

    exitOut(ctx) {
        const value = this.convertExpresion(ctx.expr());

        this.ensureHeader(headerTypes.OUTPUT);

        this.generator.out(value);
    }


    ensureVariable(id) {
        if (!this.variables.has(id)) {
            this.variables.add(id);
            this.generator.declare(id);
        }
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

            this.ensureVariable(id);
            const value = this.generator.readVar(`%${id}`);


            return {
                isVar: true,
                type: valueTypes.INT,
                value
            }
        }

        if (node.FLOAT()) {
            return;
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
