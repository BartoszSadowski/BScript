import BScriptListener from '../grammar/antlrResult/BScriptListener.js';

import Generator from './generator.js';

export default class Listener extends BScriptListener {
    constructor() {
        super();
        this.generator = new Generator();
    }

    exitStart(ctx) {
        console.log(this.generator.generate());
    }
}
