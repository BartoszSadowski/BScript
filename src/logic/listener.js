import BScriptListener from '../grammar/antlrResult/BScriptListener.js';

import Generator from './generator.js';
import {
    headerTypes,
    valueTypes
} from './constants.js';

const missing = '<missing undefined>';

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
        const ID = ctx.ID().getText();
        if (this.variables.has(ID)) {
            const symbol = ctx.ID().symbol;
            this.errors.push(`Linia ${symbol.line}:${symbol.column} zmienna o nazwie ${ID}, została wcześniej zadeklarowana.`);
            return;
        }

        const config = this.determineDefinitionType(ctx.definition());

        this.variables.set(ID, config);
        this.generator.declare(ID, config);
    }

    determineDefinitionType(node) {
        if (node.FLOAT_DEF && node.FLOAT_DEF()) {
            return {
                type: valueTypes.FLOAT,
                isArray: false
            };
        }

        if (node.INT_DEF && node.INT_DEF()) {
            return {
                type: valueTypes.INT,
                isArray: false
            };
        }

        if (node.array_def && node.array_def()) {
            const number = node.array_def().INT().getText();
            
            if (number === missing) {
                const symbol = node.array_def().INT().symbol;
                this.errors.push(`Linia ${symbol.line}:${symbol.column} błędna długość tablicy`);
            }

            return {
                ...this.determineDefinitionType(node.array_def()),
                isArray: true,
                length: node.array_def().INT().getText()
            };
        }
    }

    isVarDefined(ID) {
        const id = ID.getText ? ID.getText() : ID.text;
        if (!this.variables.has(id)) {
            const symbol = ID.symbol || ID;
            this.errors.push(`Linia ${symbol.line}:${symbol.column} zmienna o nazwie ${id}, nie została wcześniej zadeklarowana.`);
            return false;
        }

        return true;
    }

    isIndexInBound(INT, length) {
        if (INT.getText() >= length) {
            const symbol = INT.symbol;
            this.errors.push(`Linia ${symbol.line}:${symbol.column} id w tablicy przekracza jej długość. Id: ${INT.getText()}, długość: ${length}`);
        }
    }

    exitInput(ctx) {
        const {
            ID,
            idx
         } = this.loadId(ctx);
        const id = ID.getText();

        if (this.isVarDefined(ID)) {
            const { type } = this.variables.get(id);

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
    
            this.generator.scanf({
                value: `%${id}`,
                config: { ...this.variables.get(id), idx }
            }, type);
        }
    }

    exitSet(ctx) {
        const {
            ID,
            idx
        } = this.loadId(ctx);

        const id = ID.getText();

        if (this.isVarDefined(ID)) {
            const value = this.convertExpresion(ctx.expr());
    
            this.generator.set({
                value: `%${id}`,
                config: { ...this.variables.get(id), idx }
            }, value);
        }
    }

    loadId(node) {
        if (node.ID && node.ID()) {
            return {
                ID: node.ID()
            };
        }

        if (node.array_id && node.array_id()) {
            const ID = node.array_id().ID();
            const idx = node.array_id().INT().getText();

            this.isIndexInBound(node.array_id().INT(), this.variables.get(ID.getText()).length);

            if (idx === missing) {
                const symbol = node.array_id().INT().symbol;
                this.errors.push(`Linia ${symbol.line}:${symbol.column} brak indeksu w tablicy`);
            }

            return {
                ID,
                idx
            };
        }


    }

    exitOut(ctx) {
        const value = this.convertExpresion(ctx.expr());

        const { type } = value;

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

        this.generator.out(value);
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
        if (node.array_id() && this.isVarDefined(node.array_id().ID())) {
            const id = node.array_id().ID().getText();
            const idx = node.array_id().INT().getText();
            const { type, length } = this.variables.get(id);

            this.isIndexInBound(node.array_id().INT(), length);

            return {
                isVar: true,
                isPtr: false,
                type,
                value: `%${id}`,
                config: { ...this.variables.get(id), idx }
            };
        }

        if (node.ID() && this.isVarDefined(node.ID())) {
            const id = node.ID().getText();
            const { type } = this.variables.get(id);

            return {
                isVar: true,
                isPtr: false,
                isArray: false,
                type,
                value: `%${id}`,
                config: { ...this.variables.get(id) }
            };
        }

        if (node.FLOAT()) {
            return {
                isVar: false,
                isPtr: false,
                isArray: false,
                type: valueTypes.FLOAT,
                value: node.FLOAT().getText()
            };
        }

        if (node.INT()) {
            return {
                isVar: false,
                isPtr: false,
                isArray: false,
                type: valueTypes.INT,
                value: node.INT().getText()
            };
        }

        return {
            isVar: NaN,
            isPtr: NaN,
            type: NaN,
            value: NaN
        }
    }
}
