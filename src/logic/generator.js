export default class Generator {
    constructor() {
        this.headerText = '';
        this.mainText = '';
        this.declarationsText = '';
        this.reg = 0;
    }

    addHeader(type) {
        if (type === 'input') {
            this.headerText += '@.strin = private unnamed_addr constant [3 x i8] c"%d\\00"\n';
            this.headerText += 'declare i32 @scanf(i8*, ...)\n';
        }
    }

    declare(id) {
        this.declarationsText += `%${id} = alloca i32\n`;
    }

    scanf(id) {
        this.mainText += `%call = call i32 (i8*, ...) @scanf(i8* getelementptr inbounds ([3 x i8], [3 x i8]* @.strin, i32 0, i32 0), i32* %${id})\n`;
    }

    set(id, val) {
        this.mainText += `%${this.reg} = load i32, i32* %${val}\n`;
        this.mainText += `store i32 %${this.reg}, i32* %${id}\n`;
        this.reg++;
    }

    generate() {
        let text = '';
        text += this.headerText;
        text += 'define i32 @main() {\n';
        text += 'entry: \n';
        text += this.declarationsText;
        text += this.mainText;
        text += 'ret i32 0\n';
        text += '}\n';
        return text;
    }
}
