export default class Generator {
    constructor() {
        this.headerVariables = '';
        this.headerMethods = '';
        this.mainText = '';
        this.declarationsText = '';
        this.reg = 0;
        this.calls = 0;
    }

    addHeader(type) {
        if (type === 'input') {
            this.headerVariables += '@.strin = private unnamed_addr constant [3 x i8] c"%d\\00"\n';
            this.headerMethods += 'declare i32 @scanf(i8*, ...)\n';
            return;
        }

        if (type === 'output') {
            this.headerVariables += '@.strout = private unnamed_addr constant [4 x i8] c"%d\\0A\\00"\n';
            this.headerMethods += 'declare i32 @printf(i8*, ...)\n';
        } 
    }

    declare(id) {
        this.declarationsText += `%${id} = alloca i32\n`;
    }

    scanf(id) {
        this.mainText += `%call${this.calls} = call i32 (i8*, ...) @scanf(i8* getelementptr inbounds ([3 x i8], [3 x i8]* @.strin, i32 0, i32 0), i32* %${id})\n`;
        this.calls++;
    }

    set(id, val) {
        this.mainText += `%${this.reg} = load i32, i32* %${val}\n`;
        this.mainText += `store i32 %${this.reg}, i32* %${id}\n`;
        this.reg++;
    }

    out(val) {
        this.mainText += `%${this.reg} = load i32, i32* %${val}\n`;
        this.mainText += `%call${this.calls} = call i32 (i8*, ...) @printf(i8* getelementptr inbounds ([4 x i8], [4 x i8]* @.strout, i32 0, i32 0), i32 %${this.reg})`;
        this.reg++;
        this.calls++;
    }

    generate() {
        let text = '';
        text += this.headerVariables;
        text += this.headerMethods;
        text += 'define i32 @main() {\n';
        text += 'entry: \n';
        text += this.declarationsText;
        text += this.mainText;
        text += 'ret i32 0\n';
        text += '}\n';
        return text;
    }
}
