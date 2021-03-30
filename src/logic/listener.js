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
        const inputHeader = 'input';

        const ID = ctx.ID().getText();

        this.ensureVariable(ID);

        if (!this.headers.has(inputHeader)) {
            this.variables.add(inputHeader);
            this.generator.addHeader(inputHeader);
        }

        this.generator.scanf(ID);
    }

    exitSet(ctx) {
        const ID = ctx.ID().getText();
        const val = ctx.expr().getText();

        this.ensureVariable(ID);
        this.ensureVariable(val);

        this.generator.set(ID, val);
    }

    ensureVariable(id) {
        if (!this.variables.has(id)) {
            this.variables.add(id);
            this.generator.declare(id);
        }
    }
}
