import {
    headerTypes,
    valueTypes,
    scopeTypes
} from './constants.js';
import {
    typeMap,
    stringInputMap,
    stringOutputMap,
    addMethodMap,
    subMethodMap,
    mulMethodMap,
    divMethodMap,
    comparisonMaps
} from './maps.js';

const typeWeights = [valueTypes.FLOAT, valueTypes.INT];

export default class Generator {
    constructor() {
        this.globalVariables = '';
        this.mainText = '';
        this.declarationsText = '';
        this.reg = 0;
        this.calls = 0;
        this.functions = new Map();
    }

    addHeader(type) {
        switch(type) {
        case headerTypes.INPUT.FLOAT:
            this.globalVariables += '@.strinfloat = private unnamed_addr constant [3 x i8] c"%f\\00"\n';
            break;
        case headerTypes.INPUT.INT:
            this.globalVariables += '@.strinint = private unnamed_addr constant [3 x i8] c"%d\\00"\n';
            break;
        case headerTypes.OUTPUT.FLOAT:
            this.globalVariables += '@.stroutfloat = private unnamed_addr constant [4 x i8] c"%f\\0A\\00"\n';
            break;
        case headerTypes.OUTPUT.INT:
            this.globalVariables += '@.stroutint = private unnamed_addr constant [4 x i8] c"%d\\0A\\00"\n';
            break;
        default:
            break;
        }
    }

    declare(id, { type, isArray, length, scope }) {
        if (scope === scopeTypes.GLOBAL) {
            this.globalVariables += `@${id} = common global ${isArray ? `[${length} x ` : ''}${typeMap[type]}${isArray ? `] zeroinitializer` : ''}\n`;
        } else if (scope === scopeTypes.MAIN) {
            this.declarationsText += `%${id} = alloca ${isArray ? `[${length} x ` : ''}${typeMap[type]}${isArray ? `]` : ''}\n`;
        } else {
            this.functions.get(scope).entryText
                .push(`%${id} = alloca ${isArray ? `[${length} x ` : ''}${typeMap[type]}${isArray ? `]` : ''}\n`);
        }
    }

    declareFunction(id, { type }, args) {
        this.functions.set(id, {
            reg: 0,
            calls: 0,
            type,
            entryText: [
                `define ${typeMap[type]} @${id}(`,
                ...args.map(arg => `${typeMap[arg.config.type]} %${arg.id}`).join(', '),
                `) {\n`,
                'entry:\n',
                ...args.map(arg => `%${arg.id}.addr = alloca ${typeMap[arg.config.type]}\n`).join(''),
                ...args.map(arg => `store ${typeMap[arg.config.type]} %${arg.id}, ${typeMap[arg.config.type]}* %${arg.id}.addr\n`)
            ],
            bodyText: [],
            closingText: [
                '}\n'
            ]
        });
    }

    setRetVal(val, scope) {
        const funct = this.functions.get(scope);

        const { value } = this.castType(val, funct.type, scope);

        funct.bodyText.push(`ret ${typeMap[funct.type]} ${value}\n`);
    }

    callFunction(functionID, args, funArgs, scope) {
        const { type } = this.functions.get(functionID);

        const mapedArgs = args
            .map((arg, i) => {
                return this.castType(arg, funArgs[i][1].type, scopeTypes.MAIN);
            });

        let call;
        if (scope === scopeTypes.MAIN) {
            call = `%call${this.calls++}`;
            this.mainText += `${call} = call ${typeMap[type]} @${functionID}(`
            this.mainText += mapedArgs.map(arg => `${typeMap[arg.type]} ${arg.value}`).join(', ');
            this.mainText += ')\n';
        } else {
            const funct = this.functions.get(scope);
            const functText = funct.bodyText;

            call = `%call${funct.calls++}`;
            functText.push(`${call} = call ${typeMap[type]} @${functionID}(`);
            functText.push(mapedArgs.map(arg => `${typeMap[arg.type]} ${arg.value}`).join(', '));
            functText.push(')\n');
        }

        return call;
    }

    typeToWeight(type) {
        return typeWeights.findIndex(t => t === type);
    }

    typeConverter(currentType, targetType) {
        if (currentType === valueTypes.FLOAT && targetType === valueTypes.INT) {
            return 'fptosi';
        }

        if (currentType === valueTypes.INT && targetType === valueTypes.FLOAT) {
            return 'sitofp';
        }
    }

    commonType(type1, type2) {
        const weight1 = this.typeToWeight(type1);
        const weight2 = this.typeToWeight(type2);

        return weight1 < weight2 ? typeWeights[weight1] : typeWeights[weight2];
    }

    castType(val, type, scope) {
        if (val.type === type && val.isVar) {
            return this.loadValue(val, scope);
        }
        
        if (val.type === type) {
            return val;
        }

        if (!val.isVar && !val.isPtr) {
            if (val.type === valueTypes.FLOAT && type === valueTypes.INT) {
                return {
                    ...val,
                    type,
                    value: val.value.split(',')[0]
                };
            }
    
            if (val.type === valueTypes.INT && type === valueTypes.FLOAT) {
                return {
                    ...val,
                    type,
                    value: `${val.value}.0`
                };
            }
        }

        const loaded = this.loadValue(val, scope);
        let conv;

        if (scope === scopeTypes.MAIN) {
            conv = `%conv${this.calls++}`;
            this.mainText += `${conv} = ${this.typeConverter(val.type, type)} ${typeMap[val.type]} ${loaded.value} to ${typeMap[type]}\n`;
        } else {
            const funct = this.functions.get(scope);
            const functText = funct.bodyText;

            conv = `%conv${funct.calls++}`;
            functText.push(`${conv} = ${this.typeConverter(val.type, type)} ${typeMap[val.type]} ${loaded.value} to ${typeMap[type]}\n`);
        }

        return {
            isPtr: true,
            value: conv,
            type
        }
    }

    loadValue(val, scope) {
        let reg;

        const value = this.getArrayPtr(val, scope);

        if (scope === scopeTypes.MAIN) {
            reg = val.isPtr ? val.value : `%${this.reg++}`;
            this.mainText += val.isPtr ? '' : `${reg} = load ${typeMap[val.type]}, ${typeMap[val.type]}* ${value}\n`
        } else {
            const funct = this.functions.get(scope);
            const functText = funct.bodyText;

            reg = val.isPtr ? val.value : `%${funct.reg++}`;
            functText.push(val.isPtr ? '' : `${reg} = load ${typeMap[val.type]}, ${typeMap[val.type]}* ${value}${val.config.isArg ? '.addr' : ''}\n`);
        }

        return {
            ...val,
            value: reg,
            isPtr: true
        }
    }

    toCommonType(val1, val2, scope) {
        const commonType = this.commonType(val1.type, val2.type);

        return [
            this.castType(val1, commonType, scope),
            this.castType(val2, commonType, scope)
        ];
    }

    mathOperation(v1, v2, methodMap, scope) {
        const [val1, val2] = this.toCommonType(v1, v2, scope);
        const type = val1.type;

        let value;

        if (scope === scopeTypes.MAIN) {
            value = `%math${this.calls++}`;
            this.mainText += `${value} = ${methodMap[type]} ${typeMap[type]} ${val1.value}, ${val2.value}\n`;
        } else {
            const funct = this.functions.get(scope);
            const functText = funct.bodyText;

            value = `%math${funct.calls++}`;
            functText.push(`${value} = ${methodMap[type]} ${typeMap[type]} ${val1.value}, ${val2.value}\n`);
        }

        return {
            isPtr: true,
            isVar: true,
            isArray: false,
            value,
            type,
            config: {
                isArray: false
            }
        };
    }

    addValues(val1, val2, scope) {
        return this.mathOperation(val1, val2, addMethodMap, scope);
    }

    subValues(val1, val2, scope) {
        return this.mathOperation(val1, val2, subMethodMap, scope);
    }

    mulValues(val1, val2, scope) {
        return this.mathOperation(val1, val2, mulMethodMap, scope);
    }

    divValues(val1, val2, scope) {
        return this.mathOperation(val1, val2, divMethodMap, scope);
    }

    compareValues(v1, v2, method, scope) {
        const [val1, val2] = this.toCommonType(v1, v2, scope);
        const type = val1.type;

        let value;

        if (scope === scopeTypes.MAIN) {
            value = `%cmp${this.calls++}`;
            this.mainText += `${value} = ${comparisonMaps[method][type]} ${typeMap[type]} ${val1.value}, ${val2.value}\n`;
        } else {
            const funct = this.functions.get(scope);
            const functText = funct.bodyText;

            value = `%cmp${funct.calls++}`;
            functText.push(`${value} = ${comparisonMaps[method][type]} ${typeMap[type]} ${val1.value}, ${val2.value}\n`);
        }

        return {
            isPtr: true,
            isVar: true,
            isArray: false,
            value,
            type,
            config: {
                isArray: false
            }
        };
    }

    scanf(id, type, scope) {
        const ptr = this.getArrayPtr(id, scope);

        if (scope === scopeTypes.MAIN) {
            this.mainText += `%call${this.calls++} = call i32 (i8*, ...) @scanf(i8* getelementptr inbounds ([3 x i8], [3 x i8]* ${stringInputMap[type]}, i32 0, i32 0), ${typeMap[type]}* ${ptr})\n`;
        } else {
            const funct = this.functions.get(scope);
            const functText = funct.bodyText;

            functText.push(`%call${funct.calls++} = call i32 (i8*, ...) @scanf(i8* getelementptr inbounds ([3 x i8], [3 x i8]* ${stringInputMap[type]}, i32 0, i32 0), ${typeMap[type]}* ${ptr})\n`);
        }

    }

    getArrayPtr(id, scope) {
        const entryPtr = id.value;

        if (id.config.isArray) {
            let arrayidx;
            if (scope === scopeTypes.MAIN) {
                arrayidx = `%arrayidx${this.calls++}`;
                this.mainText += `${arrayidx} = getelementptr inbounds [${id.config.length} x ${typeMap[id.config.type]}], [${id.config.length} x ${typeMap[id.config.type]}]* ${entryPtr}, i32 0, i64 ${id.config.idx}\n`;
            } else {
                const funct = this.functions.get(scope);
                const functText = funct.bodyText;

                arrayidx = `%arrayidx${funct.calls++}`;
                functText.push(`${arrayidx} = getelementptr inbounds [${id.config.length} x ${typeMap[id.config.type]}], [${id.config.length} x ${typeMap[id.config.type]}]* ${entryPtr}, i32 0, i64 ${id.config.idx}\n`);
            }
            return arrayidx;
        }

        return entryPtr;
    }

    set(id, val, scope) {
        const value = this.castType(val, id.config.type, scope);

        const entryPtr = this.getArrayPtr(id, scope);

        if (scope === scopeTypes.MAIN) {
            this.mainText += `store ${typeMap[id.config.type]} ${value.value}, ${typeMap[id.config.type]}* ${entryPtr}\n`;
        } else {
            const functText = this.functions.get(scope).bodyText;

            functText.push(`store ${typeMap[id.config.type]} ${value.value}, ${typeMap[id.config.type]}* ${entryPtr}\n`);
        }

    }

    out(val, scope) {
        const loaded = this.loadValue(val, scope);
        
        if (scope === scopeTypes.MAIN) {
            const call = loaded.type !== valueTypes.FLOAT ? loaded.value : `%conv${this.calls++}`; 
            this.mainText += loaded.type !== valueTypes.FLOAT ? '' : `${call} = fpext float ${loaded.value} to double\n`;
            const type = loaded.type !== valueTypes.FLOAT ? loaded.type : valueTypes.DOUBLE; 
            this.mainText += `%call${this.calls} = call i32 (i8*, ...) @printf(i8* getelementptr inbounds ([4 x i8], [4 x i8]* ${stringOutputMap[type]}, i32 0, i32 0), ${typeMap[type]} ${call})\n`;
            this.calls++;
        } else {
            const funct = this.functions.get(scope);
            const functText = funct.bodyText;

            const call = loaded.type !== valueTypes.FLOAT ? loaded.value : `%conv${funct.calls++}`; 
            functText.push(loaded.type !== valueTypes.FLOAT ? '' : `${call} = fpext float ${loaded.value} to double\n`);
            const type = loaded.type !== valueTypes.FLOAT ? loaded.type : valueTypes.DOUBLE; 
            functText.push(`%call${funct.calls} = call i32 (i8*, ...) @printf(i8* getelementptr inbounds ([4 x i8], [4 x i8]* ${stringOutputMap[type]}, i32 0, i32 0), ${typeMap[type]} ${call})\n`);
            funct.calls++;
        }
    }

    beginIf(condition, scope) {
        let label1;
        let label2;
        if (scope === scopeTypes.MAIN) {
            label1 = `if.then.${this.calls++}`;
            label2 = `if.end.${this.calls++}`;
            this.mainText += `br i1 ${condition.value}, label %${label1}, label %${label2}\n`;
            this.mainText += `${label1}:\n`;
        } else {
            const funct = this.functions.get(scope);
            const functText = funct.bodyText;

            label1 = `if.then.${funct.calls++}`;
            label2 = `if.end.${funct.calls++}`;

            functText.push(`br i1 ${condition.value}, label ${label1}, label${label2}\n`);
            functText.push(`${label1}:\n`);
        }

        return label2;
    }

    endIf(ending, scope) {
        if (scope === scopeTypes.MAIN) {
            this.mainText += `br label %${ending}\n`;
            this.mainText += `${ending}:\n`;
        } else {
            const funct = this.functions.get(scope);
            const functText = funct.bodyText;

            functText.push(`br label %${ending}\n`);
            functText.push(`${ending}:\n`);
        }
    }

    generate() {
        let text = '';
        text += this.globalVariables;
        text += 'declare i32 @scanf(i8*, ...)\n';
        text += 'declare i32 @printf(i8*, ...)\n';
        this.functions
            .forEach(value => {
                value.entryText
                    .forEach(str => text += str);
                value.bodyText
                    .forEach(str => text += str);
                value.closingText
                    .forEach(str => text += str);
            });
        text += 'define i32 @main() {\n';
        text += 'entry: \n';
        text += this.declarationsText;
        text += this.mainText;
        text += 'ret i32 0\n';
        text += '}\n';
        return text;
    }
}
