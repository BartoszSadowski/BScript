export default class Generator {
    constructor() {
        this.headerText = '';
        this.mainText = '';
    }

    addHeader(type) {
        if (type === 'input') {
            this.headerText += '@.strin = private unnamed_addr constant [3 x i8] c"%d\\00"\n'
            this.headerText += 'declare i32 @scanf(i8*, ...)\n'
        }
    }

    declare(id) {
        this.mainText += `%${id} = alloca i32\n`;
    }

    scanf(id) {
        this.mainText += `call i32 (i8*, ...) @scanf(i8* getelementptr inbounds ([3 x i8], [3 x i8]* @.strin, i32 0, i32 0), i32* %${id})\n`
    }

    generate() {
        let text = '';
        text += this.headerText;
        text += 'define i32 @main() {\n';
        text += this.mainText
        text += 'ret i32 0\n';
        text += '}\n';
        return text;
    }
}
