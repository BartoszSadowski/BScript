import BScriptListener from '../grammar/antlrResult/BScriptListener.js';

import Generator from './generator.js';

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
        this.ensureHeader('input');

        this.generator.scanf(ID);
    }

    exitSet(ctx) {
        const ID = ctx.ID().getText();
        const val = ctx.expr().getText();

        this.ensureVariable(ID);
        this.ensureVariable(val);

        this.generator.set(ID, val);
    }

    exitOut(ctx) {
        const val = ctx.expr().getText();

        this.ensureVariable(val);
        this.ensureHeader('output');

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
}
