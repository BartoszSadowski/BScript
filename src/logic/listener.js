import BScriptListener from '../grammar/antlrResult/BScriptListener.js';

import Generator from './generator.js';

export default class Listener extends BScriptListener {
    constructor() {
        super();
        this.generator = new Generator();
        this.variables = new Set();
    }

    exitStart(ctx) {
        console.log(this.generator.generate());
    }

    exitInput(ctx) {
        const ID = ctx.ID().getText();
        if (!this.variables.has(ID)) {
            this.variables.add(ID);
            this.generator.declare(ID);
        }
    }
}
