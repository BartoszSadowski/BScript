export default class Generator {
    constructor() {
        this.headerText = '';
        this.mainText = '';
    }

    declare(id) {
        this.mainText += `%${id} = alloca i32\n`;
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
