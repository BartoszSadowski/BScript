import BScriptListener from '../grammar/antlrResult/BScriptListener.js';

import Generator from './generator.js';
import {
    headerTypes,
    valueTypes,
    scopeTypes,
    actionTypes,
    comparisonTypes
} from './constants.js';

const missing = '<missing undefined>';

export default class Listener extends BScriptListener {
    constructor() {
        super();
        this.generator = new Generator();
        this.headers = new Set();
        this.errors = [];
        this.scope = scopeTypes.GLOBAL;
        this.variables = new Map();
        this.variables.set(scopeTypes.GLOBAL, new Map());
        this.currentScopeVariables = this.variables.get(this.scope);
        this.callStack = new Map();
        this.callStackCalle = [];
        this.callStackId = 0;
    }

    exitStart(ctx) {
        if (this.errors.length === 0) {
            console.log(this.generator.generate());
            return;
        }

        this.errors.forEach(error => console.error(error));
    }

    changeScope(name) {
        this.scope = name;

        if(!this.variables.get(name)) {
            this.variables.set(name, new Map());
        }

        this.currentScopeVariables = this.variables.get(this.scope);
    }

    enterDefine_function() {
        const id = this.callStackId++;
        this.callStackCalle.push(id);
        this.callStack.set(id, []);
    }

    exitDefine_function(ctx) {
        const ID = ctx.ID().getText();
        
        if (
            this.currentScopeVariables.has(ID)
        ) {
            const symbol = ctx.ID().symbol;
            this.errors.push(`Linia ${symbol.line}:${symbol.column} funkcja lub zmienna ${ID} już zadeklarowana.`);
            return;
        }

        const config = { ...this.determineDefinitionType(ctx), isFunction: true };

        this.currentScopeVariables.set(ID, config);

        this.changeScope(ID);

        const args = this.retrieveArguments(ctx);

        this.generator.declareFunction(ID, config, args);

        const stack = this.callStackCalle.pop();

        this.callStack.get(stack).forEach(({ type, ctx, stack }) => {
            switch(type) {
            case actionTypes.DEFINE:
                this.exitDefine(ctx);
                break;
            case actionTypes.OUT:
                this.exitOut(ctx);
                break;
            case actionTypes.IN:
                this.exitInput(ctx);
                break;
            case actionTypes.SET:
                this.exitSet(ctx);
                break;
            case actionTypes.IF:
                this.exitCondition(ctx, stack);
                break;
            case actionTypes.WHILE:
                this.exitLoop(ctx, stack);
            default:
                break;
            }
        });

        this.generator.setRetVal(this.convertExpresion(ctx.expr()), this.scope);

        this.changeScope(scopeTypes.GLOBAL);
    }

    exitFunction_definitions(ctx) {
        this.changeScope(scopeTypes.MAIN);
    }
    
    retrieveArguments(node) {
        const args1 = node.function_args()
            .map(arg => {
                const id = arg.ID().getText()
                if (
                    this.currentScopeVariables.has(id)
                ) {
                    const symbol = arg.ID().symbol;
                    this.errors.push(`Linia ${symbol.line}:${symbol.column} parametr ${id} nie posiada unikalnej nazwy.`);
                }
                
                const config = this.determineDefinitionType(arg, true);

                this.currentScopeVariables.set(id, config);

                return {
                    id,
                    config
                };
            });

        if(node.function_args()[0]) {
            return [...args1, ...this.retrieveArguments(node.function_args()[0])]
        } else {
            return [];
        }
    }

    enterCondition() {
        const id = this.callStackId++;
        this.callStackCalle.push(id);
        this.callStack.set(id, []);
    }

    exitCondition(ctx, callStack) {
        const stack = callStack || this.callStackCalle.pop();

        if (this.callStackCalle.length) {
            this.callStack.get(this.callStackCalle[this.callStackCalle.length-1]).push({
                type: actionTypes.IF,
                ctx,
                stack
            })
            return;
        } else {
            const conditionRes = this.convertCondtion(ctx.cond());

            const ending = this.generator.beginIf(conditionRes, this.scope);

            this.callStack.get(stack).forEach(({ type, ctx, stack }) => {
                switch(type) {
                case actionTypes.DEFINE:
                    this.exitDefine(ctx);
                    break;
                case actionTypes.OUT:
                    this.exitOut(ctx);
                    break;
                case actionTypes.IN:
                    this.exitInput(ctx);
                    break;
                case actionTypes.SET:
                    this.exitSet(ctx);
                    break;
                case actionTypes.IF:
                    this.exitCondition(ctx, stack);
                    break;
                case actionTypes.WHILE:
                    this.exitLoop(ctx, stack);
                default:
                    break;
                }
            });

            this.generator.endIf(ending, this.scope);
        }
    }

    enterLoop() {
        const id = this.callStackId++;
        this.callStackCalle.push(id);
        this.callStack.set(id, []);
    }

    exitLoop(ctx, callStack) {
        const stack = callStack || this.callStackCalle.pop();

        if (this.callStackCalle.length) {
            this.callStack.get(this.callStackCalle[this.callStackCalle.length-1]).push({
                type: actionTypes.WHILE,
                ctx,
                stack
            })
            return;
        } else {
            const whileLabel = this.generator.preWhile(this.scope);

            const conditionRes = this.convertCondtion(ctx.cond());

            const ending = this.generator.beginWhile(conditionRes, this.scope);

            this.callStack.get(stack).forEach(({ type, ctx, stack }) => {
                switch(type) {
                case actionTypes.DEFINE:
                    this.exitDefine(ctx);
                    break;
                case actionTypes.OUT:
                    this.exitOut(ctx);
                    break;
                case actionTypes.IN:
                    this.exitInput(ctx);
                    break;
                case actionTypes.SET:
                    this.exitSet(ctx);
                    break;
                case actionTypes.IF:
                    this.exitCondition(ctx, stack);
                    break;
                case actionTypes.WHILE:
                    this.exitLoop(ctx, stack);
                default:
                    break;
                }
            });

            this.generator.endWhile(whileLabel, ending, this.scope);
        }
    }

    exitDefine(ctx) {
        if (
            this.callStackCalle.length
        ) {
            this.callStack.get(this.callStackCalle[this.callStackCalle.length-1]).push({
                type: actionTypes.DEFINE,
                ctx
            })
            return;
        }

        const ID = ctx.ID().getText();
        if (
            this.currentScopeVariables.has(ID)
        ) {
            const symbol = ctx.ID().symbol;
            this.errors.push(`Linia ${symbol.line}:${symbol.column} zmienna o nazwie ${ID}, została wcześniej zadeklarowana.`);
            return;
        }

        const config = this.determineDefinitionType(ctx.definition());

        this.currentScopeVariables.set(ID, config);
       
        this.generator.declare(ID, config);
    }

    determineDefinitionType(node, arg) {
        const isArg = arg ? true : false;

        if (node.FLOAT_DEF && node.FLOAT_DEF()) {
            return {
                type: valueTypes.FLOAT,
                isArray: false,
                scope: this.scope,
                isFunction: false,
                isArg
            };
        }

        if (node.INT_DEF && node.INT_DEF()) {
            return {
                type: valueTypes.INT,
                isArray: false,
                scope: this.scope,
                isFunction: false,
                isArg
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
                length: node.array_def().INT().getText(),
                scope: this.scope,
                isFunction: false,
                isArg
            };
        }
    }

    isVarDefined(ID) {
        const id = ID.getText ? ID.getText() : ID.text;
        if (
            this.currentScopeVariables.has(id)
            || this.variables.get(scopeTypes.GLOBAL).has(id)
        ) {
            return true;
        }

        const symbol = ID.symbol || ID;
        this.errors.push(`Linia ${symbol.line}:${symbol.column} zmienna o nazwie ${id}, nie została wcześniej zadeklarowana.`);
        return false;

    }

    isIndexInBound(INT, length) {
        if (INT.getText() >= length) {
            const symbol = INT.symbol;
            this.errors.push(`Linia ${symbol.line}:${symbol.column} id w tablicy przekracza jej długość. Id: ${INT.getText()}, długość: ${length}`);
        }
    }

    getVariable(id) {
        if (this.currentScopeVariables.has(id)) {
            return this.currentScopeVariables.get(id);
        }

        if (this.variables.get(scopeTypes.GLOBAL).has(id)) {
            return this.variables.get(scopeTypes.GLOBAL).get(id);
        }

        this.errors.push(`Zmienna o nazwie ${id}, nie została wcześniej zadeklarowana.`);

        return {
            type: NaN,
            isArray: NaN,
            scope: NaN
        };
    }

    exitInput(ctx) {
        if (
            this.callStackCalle.length
        ) {
            this.callStack.get(this.callStackCalle[this.callStackCalle.length-1]).push({
                type: actionTypes.IN,
                ctx
            })
            return;
        }

        const {
            ID,
            idx
         } = this.loadId(ctx);
        const id = ID.getText();

        if (this.isVarDefined(ID)) {
            const { type } = this.getVariable(id);

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
    
            const varConfig = this.getVariable(id);

            this.generator.scanf({
                value: `${varConfig.scope === scopeTypes.GLOBAL ? '@' : '%'}${id}`,
                config: { ...varConfig, idx }
            }, type, this.scope);
        }
    }

    exitSet(ctx) {
        if (
            this.callStackCalle.length
        ) {
            this.callStack.get(this.callStackCalle[this.callStackCalle.length-1]).push({
                type: actionTypes.SET,
                ctx
            })
            return;
        }

        const {
            ID,
            idx
        } = this.loadId(ctx);

        const id = ID.getText();

        if (this.isVarDefined(ID)) {
            const value = this.convertExpresion(ctx.expr());

            const varConfig = this.getVariable(id);
    
            this.generator.set({
                value: `${varConfig.scope === scopeTypes.GLOBAL ? '@' : '%'}${id}`,
                config: { ...varConfig, idx }
            }, value, this.scope);
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

            this.isIndexInBound(node.array_id().INT(), this.getVariable(ID.getText()).length);

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
        if (
            this.callStackCalle.length
        ) {
            this.callStack.get(this.callStackCalle[this.callStackCalle.length-1]).push({
                type: actionTypes.OUT,
                ctx
            })
            return;
        }

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

        this.generator.out(value, this.scope);
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
                return this.generator.addValues(val1, val2, this.scope);
            }
    
            if (node.SUB && node.SUB()) {
                return this.generator.subValues(val1, val2, this.scope);
            }
    
            if (node.MUL && node.MUL()) {
                return this.generator.mulValues(val1, val2, this.scope);
            }
    
            if (node.DIV && node.DIV()) {
                return this.generator.divValues(val1, val2, this.scope);
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
            const { type, length } = this.getVariable(id);

            this.isIndexInBound(node.array_id().INT(), length);

            const varConfig = this.getVariable(id);

            return {
                isVar: true,
                isPtr: false,
                type,
                value: `${varConfig.scope === scopeTypes.GLOBAL ? '@' : '%'}${id}`,
                config: { ...varConfig, idx }
            };
        }

        if (node.ID() && this.isVarDefined(node.ID())) {
            const id = node.ID().getText();
            const { type } = this.getVariable(id);

            const varConfig = this.getVariable(id);

            return {
                isVar: true,
                isPtr: false,
                isArray: false,
                type,
                value: `${varConfig.scope === scopeTypes.GLOBAL ? '@' : '%'}${id}`,
                config: { ...varConfig }
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

        if (node.function_call()) {
            const functionID = node.function_call().ID().getText();

            const functionArgs = this.retrieveFunctionArguments(node.function_call());

            if(!this.variables.has(functionID)) {
                const symbol = node.function_call().ID().symbol;
                this.errors.push(`Linia ${symbol.line}:${symbol.column} funkcja ${functionID} nie została zadeklarowana.`);
                
                return {
                    isVar: NaN,
                    isPtr: NaN,
                    type: NaN,
                    value: NaN,
                    isArray: NaN,
                    config: {
                        isArray: NaN
                    }
                };
            }

            const functionScope = this.variables.get(functionID);
            
            const functionsArgs = [...functionScope].filter(([k, v]) => v.isArg);

            if (functionsArgs.length !== functionArgs.length) {
                const symbol = node.function_call().ID().symbol;
                this.errors.push(`Linia ${symbol.line}:${symbol.column} funkcja ${functionID} posiada ${functionsArgs.length} argumentów, wywołana z ${functionArgs.length} argumentami.`);
                
                return {
                    isVar: NaN,
                    isPtr: NaN,
                    type: NaN,
                    value: NaN,
                    isArray: NaN,
                    config: {
                        isArray: NaN
                    }
                };
            }

            const { type } = this.variables.get(scopeTypes.GLOBAL).get(functionID);
            return this.generator.callFunction(functionID, functionArgs, functionsArgs, this.scope);
        }

        return {
            isVar: NaN,
            isPtr: NaN,
            type: NaN,
            value: NaN,
            isArray: NaN,
            config: {
                isArray: NaN
            }
        }
    }

    retrieveFunctionArguments(node) {
        const args1 = node.args()
            .map(arg => {
                return this.convertValue(arg.value());
            });


        if(node.args()[0]) {
            return [...args1, ...this.retrieveFunctionArguments(node.args()[0])];
        } else {
            return [];
        }
    }

    convertCondtion(node) {
        const [statement1, statement2] = node.expr();
        const val1 = this.convertExpresion(statement1);
        const val2 = this.convertExpresion(statement2);

        let method;


        if(node.EQUALS()) {
            method = comparisonTypes.EQ;
        }

        if(node.NOT_EQUALS()) {
            method = comparisonTypes.NEQ;
        }

        if(node.GT()) {
            method = comparisonTypes.GT;
        }

        if(node.GTEQ()) {
            method = comparisonTypes.GTEQ;
        }

        if(node.LT()) {
            method = comparisonTypes.LT;
        }

        if(node.LTEQ()) {
            method = comparisonTypes.LTEQ;
        }

        return this.generator.compareValues(val1, val2, method, this.scope);
    }
}
