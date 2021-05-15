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
    divMethodMap
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
        } else {
            this.declarationsText += `%${id} = alloca ${isArray ? `[${length} x ` : ''}${typeMap[type]}${isArray ? `]` : ''}\n`;
        }
    }

    declareFunction(id, { type }, args) {
        this.functions.set(id, {
            reg: 0,
            calls: 0,
            entryText: [
                `define ${typeMap[type]} @${id}(`,
                ...args.map(arg => `${typeMap[arg.config.type]} ${arg.id}`).join(', '),
                `) {\n`,
                'entry:\n'
            ],
            bodyText: [],
            closingText: [
                '}\n'
            ]
        });
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

    castType(val, type) {
        if (val.type === type && val.isVar) {
            return this.loadValue(val);
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

        const loaded = this.loadValue(val);
        const conv = `%conv${this.calls++}`;
        this.mainText += `${conv} = ${this.typeConverter(val.type, type)} ${typeMap[val.type]} ${loaded.value} to ${typeMap[type]}\n`

        return {
            isPtr: true,
            value: conv,
            type
        }
    }

    loadValue(val) {
        const value = this.getArrayPtr(val);

        const reg = val.isPtr ? val.value : `%${this.reg++}`;
        this.mainText += val.isPtr ? '' : `${reg} = load ${typeMap[val.type]}, ${typeMap[val.type]}* ${value}\n`

        return {
            ...val,
            value: reg,
            isPtr: true
        }
    }

    toCommonType(val1, val2) {
        const commonType = this.commonType(val1.type, val2.type);

        return [
            this.castType(val1, commonType),
            this.castType(val2, commonType)
        ];
    }

    mathOperation(v1, v2, methodMap) {
        const [val1, val2] = this.toCommonType(v1, v2);
        const type = val1.type;

        const value = `%math${this.calls++}`;
        this.mainText += `${value} = ${methodMap[type]} ${typeMap[type]} ${val1.value}, ${val2.value}\n`;

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

    addValues(val1, val2) {
        return this.mathOperation(val1, val2, addMethodMap);
    }

    subValues(val1, val2) {
        return this.mathOperation(val1, val2, subMethodMap);
    }

    mulValues(val1, val2) {
        return this.mathOperation(val1, val2, mulMethodMap);
    }

    divValues(val1, val2) {
        return this.mathOperation(val1, val2, divMethodMap);
    }

    scanf(id, type) {
        const ptr = this.getArrayPtr(id);

        this.mainText += `%call${this.calls} = call i32 (i8*, ...) @scanf(i8* getelementptr inbounds ([3 x i8], [3 x i8]* ${stringInputMap[type]}, i32 0, i32 0), ${typeMap[type]}* ${ptr})\n`;
        this.calls++;
    }

    getArrayPtr(id) {
        const entryPtr = id.value;

        if (id.config.isArray) {
            const arrayidx = `%arrayidx${this.calls++}`;
            this.mainText += `${arrayidx} = getelementptr inbounds [${id.config.length} x ${typeMap[id.config.type]}], [${id.config.length} x ${typeMap[id.config.type]}]* ${entryPtr}, i32 0, i64 ${id.config.idx}\n`
            return arrayidx;
        }

        return entryPtr;
    }

    set(id, val) {
        const value = this.castType(val, id.config.type);

        const entryPtr = this.getArrayPtr(id);

        this.mainText += `store ${typeMap[id.config.type]} ${value.value}, ${typeMap[id.config.type]}* ${entryPtr}\n`;
    }

    out(val) {
        const loaded = this.loadValue(val);

        const call = loaded.type !== valueTypes.FLOAT ? loaded.value : `%conv${this.calls++}`; 
        this.mainText += loaded.type !== valueTypes.FLOAT ? '' : `${call} = fpext float ${loaded.value} to double\n`;
        const type = loaded.type !== valueTypes.FLOAT ? loaded.type : valueTypes.DOUBLE; 
        this.mainText += `%call${this.calls} = call i32 (i8*, ...) @printf(i8* getelementptr inbounds ([4 x i8], [4 x i8]* ${stringOutputMap[type]}, i32 0, i32 0), ${typeMap[type]} ${call})\n`;
        this.calls++;
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
