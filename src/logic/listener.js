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
        if (node.value()) {
            return this.convertValue(node.value());
        }

        if (node.add()) {
            console.log('add');
            return;
        }
    }

    convertValue(node) {
        if (node.ID()) {
            const id = node.ID().getText();

            this.ensureVariable(id);
            const value = this.generator.readVar(id);


            return {
                type: valueTypes.VARIABLE,
                value
            }
        }

        if (node.FLOAT()) {
            return;
        }

        if (node.INT()) {
            const value = node.INT().getText();

            return {
                type: valueTypes.INT,
                value
            };
        }
    }
}
