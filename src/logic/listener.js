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
        const { value } = this.convertValue(ctx.expr().value());

        this.ensureVariable(ID);

        this.generator.set(ID, value);
    }

    exitOut(ctx) {
        const val = ctx.expr().getText();

        this.ensureVariable(val);
        this.ensureHeader(headerTypes.OUTPUT);

        this.generator.out(val);
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

    convertValue(node) {
        if (node.ID()) {
            const value = node.ID().getText();

            this.ensureVariable(value);

            return {
                type: valueTypes.VARIABLE,
                value
            }
        }

        if (node.FLOAT()) {
            return;
        }

        if (node.INT()) {
            return;
        }
    }
}
