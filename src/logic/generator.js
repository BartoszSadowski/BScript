import {
    headerTypes,
    valueTypes
} from './constants.js';

const typeMap = {
    [valueTypes.FLOAT]: 'float',
    [valueTypes.INT]: 'i32'
};

const stingInputMap = {
    [valueTypes.FLOAT]: '@.strinfloat',
    [valueTypes.INT]: '@.strinint'
}


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

    readVar(id) {
        const reg = this.reg++;
        this.mainText += `%${reg} = load i32, i32* ${id}\n`;
        return `%${reg}`;
    }

    addValues(val1, val2) {
        const call = this.calls++;
        this.mainText += `%add${call} = add nsw i32 ${val1.value}, ${val2.value}\n`;
        return { value: `%add${call}` };
    }

    subValues(val1, val2) {
        const call = this.calls++;
        this.mainText += `%sub${call} = sub nsw i32 ${val1.value}, ${val2.value}\n`;
        return { value: `%sub${call}` };
    }

    mulValues(val1, val2) {
        const call = this.calls++;
        this.mainText += `%mul${call} = mul nsw i32 ${val1.value}, ${val2.value}\n`;
        return { value: `%mul${call}` };
    }

    divValues(val1, val2) {
        const call = this.calls++;
        this.mainText += `%div${call} = sdiv i32 ${val1.value}, ${val2.value}\n`;
        return { value: `%div${call}` };
    }

    scanf(id, type) {
        this.mainText += `%call${this.calls} = call i32 (i8*, ...) @scanf(i8* getelementptr inbounds ([3 x i8], [3 x i8]* ${stingInputMap[type]}, i32 0, i32 0), ${typeMap[type]}* %${id})\n`;
        this.calls++;
    }

    set(id, { value }) {
        this.mainText += `store i32 ${value}, i32* %${id}\n`;
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
