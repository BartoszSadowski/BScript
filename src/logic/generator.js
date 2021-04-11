import {
    headerTypes,
    valueTypes
} from './constants.js';
import {
    typeMap,
    stringInputMap,
    addMethodMap,
    subMethodMap,
    mulMethodMap,
    divMethodMap
} from './maps.js';

const typeWeights = [valueTypes.FLOAT, valueTypes.INT];

export default class Generator {
    constructor() {
        this.headerVariables = '';
        this.mainText = '';
        this.declarationsText = '';
        this.reg = 0;
        this.calls = 0;
    }

    addHeader(type) {
        switch(type) {
        case headerTypes.INPUT.FLOAT:
            this.headerVariables += '@.strinfloat = private unnamed_addr constant [3 x i8] c"%f\\00"\n';
            break;
        case headerTypes.INPUT.INT:
            this.headerVariables += '@.strinint = private unnamed_addr constant [3 x i8] c"%d\\00"\n';
            break;
        case headerTypes.OUTPUT:
            this.headerVariables += '@.strout = private unnamed_addr constant [4 x i8] c"%d\\0A\\00"\n';
            break;
        default:
            break;
        }
    }

    declare(id, type) {
        this.declarationsText += `%${id} = alloca ${typeMap[type]}\n`;
    }

    readVar(id, type) {
        const reg = `%${this.reg++}`;
        this.mainText += `${reg} = load ${typeMap[type]}, ${typeMap[type]}* ${id}\n`;
        return {
            value: reg,
            type
        };
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
            return this.readVar(val.value, val.type);
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

        const reg = val.isPtr ? val.value : `%${this.reg++}`;
        const conv = `%conv${this.calls++}`;
        this.mainText += val.isPtr ? '' : `${reg} = load ${typeMap[val.type]}, ${typeMap[val.type]}* ${val.value}\n`
        this.mainText += `${conv} = ${this.typeConverter(val.type, type)} ${typeMap[val.type]} ${reg} to ${typeMap[type]}\n`

        return {
            isPtr: true,
            value: conv,
            type
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
            value,
            type
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
        this.mainText += `%call${this.calls} = call i32 (i8*, ...) @scanf(i8* getelementptr inbounds ([3 x i8], [3 x i8]* ${stringInputMap[type]}, i32 0, i32 0), ${typeMap[type]}* %${id})\n`;
        this.calls++;
    }

    set(id, val) {
        const value = this.castType(val, id.type);
        this.mainText += `store ${typeMap[id.type]} ${value.value}, ${typeMap[id.type]}* ${id.value}\n`;
    }

    out({ value }) {
        this.mainText += `%call${this.calls} = call i32 (i8*, ...) @printf(i8* getelementptr inbounds ([4 x i8], [4 x i8]* @.strout, i32 0, i32 0), i32 ${value})\n`;
        this.calls++;
    }

    generate() {
        let text = '';
        text += this.headerVariables;
        text += 'declare i32 @scanf(i8*, ...)\n';
        text += 'declare i32 @printf(i8*, ...)\n';
        text += 'define i32 @main() {\n';
        text += 'entry: \n';
        text += this.declarationsText;
        text += this.mainText;
        text += 'ret i32 0\n';
        text += '}\n';
        return text;
    }
}
