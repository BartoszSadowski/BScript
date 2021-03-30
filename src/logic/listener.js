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
        if (!this.variables.has(ID)) {
            this.variables.add(ID);
            this.generator.declare(ID);
        }
        if (!this.headers.has(inputHeader)) {
            this.variables.add(inputHeader);
            this.generator.addHeader(inputHeader);
        }
        this.generator.scanf(ID);
    }
}
