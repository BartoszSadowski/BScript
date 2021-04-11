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
        this.variables = new Map();
        this.headers = new Set();
        this.errors = [];
    }

    exitStart(ctx) {
        if (this.errors.length === 0) {
            console.log(this.generator.generate());
            return;
        }

        this.errors.forEach(error => console.error(error));
    }

    exitDefine(ctx) {
        let type;
        const ID = ctx.ID().getText();
        if (this.variables.has(ID)) {
            const symbol = ctx.ID().symbol;
            this.errors.push(`Linia ${symbol.line}:${symbol.column} zmienna o nazwie ${ID}, została wcześniej zadeklarowana.`);
            return;
        }

        if (ctx.definition().FLOAT_DEF()) {
            type = valueTypes.FLOAT;
        }

        if (ctx.definition().INT_DEF()) {
            type = valueTypes.INT;
        }

        this.variables.set(ID, type);
        this.generator.declare(ID, type);
    }

    isVarDefined(ID) {
        const id = ID.getText()
        if (!this.variables.has(id)) {
            const symbol = ID.symbol;
            this.errors.push(`Linia ${symbol.line}:${symbol.column} zmienna o nazwie ${id}, nie została wcześniej zadeklarowana.`);
            return false;
        }

        return true;
    }

    exitInput(ctx) {
        const ID = ctx.ID();
        const id = ID.getText();

        if (this.isVarDefined(ID)) {
            const type = this.variables.get(id);

            switch(type) {
            case valueTypes.INT:
                this.ensureHeader(headerTypes.INPUT.INT);
                break;
            case valueTypes.FLOAT:
                this.ensureHeader(headerTypes.INPUT.FLOAT);
                break;
            default:
                break;
            }
    
            this.generator.scanf(ID.getText(), type);
        }
    }

    exitSet(ctx) {
        const ID = ctx.ID();
        const id = ID.getText();

        if (this.isVarDefined(ID)) {
            const value = this.convertExpresion(ctx.expr());
    
            this.generator.set({
                value: `%${id}`,
                type: this.variables.get(id)
            }, value);
        }
    }

    exitOut(ctx) {
        const value = this.convertExpresion(ctx.expr());

        const type = value.type;

        switch(type) {
        case valueTypes.INT:
            this.ensureHeader(headerTypes.OUTPUT.INT);
            break;
        case valueTypes.FLOAT:
            this.ensureHeader(headerTypes.OUTPUT.FLOAT);
            break;
        default:
            break;
        }

        this.generator.out(value, type);
    }

    ensureHeader(type) {
        if (!this.headers.has(type)) {
            this.headers.add(type);
            this.generator.addHeader(type);
        }
    }

    convertExpresion(node) {
        if (node.op) {
            const [statement1, statement2] = node.expr();
            const val1 = this.convertExpresion(statement1);
            const val2 = this.convertExpresion(statement2);
            
            if (node.ADD && node.ADD()) {
                return this.generator.addValues(val1, val2);
            }
    
            if (node.SUB && node.SUB()) {
                return this.generator.subValues(val1, val2);
            }
    
            if (node.MUL && node.MUL()) {
                return this.generator.mulValues(val1, val2);
            }
    
            if (node.DIV && node.DIV()) {
                return this.generator.divValues(val1, val2);
            }
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
            this.isVarDefined(node.ID());

            const id = node.ID().getText();
            const type = this.variables.get(id);

            return {
                isVar: true,
                isPtr: false,
                type: type,
                value: `%${id}`
            }
        }

        if (node.FLOAT()) {
            return {
                isVar: false,
                isPtr: false,
                type: valueTypes.FLOAT,
                value: node.FLOAT.getText()
            };
        }

        if (node.INT()) {
            return {
                isVar: false,
                isPtr: false,
                type: valueTypes.INT,
                value: node.INT().getText()
            };
        }
    }
}
