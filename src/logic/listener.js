import BScriptListener from '../grammar/antlrResult/BScriptListener.js';

export default class Listener extends BScriptListener {
    enterStart(ctx) {
        console.log("Begin start");
    }

    exitStart(ctx) {
        console.log("Exit start");
    }
}
