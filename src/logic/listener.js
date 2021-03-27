import BScriptListener from '../grammar/antlrResult/BScriptListener.js';

export default class Listener extends BScriptListener {
    exitStart(ctx) {
        console.log("Exit start");
    }
}
