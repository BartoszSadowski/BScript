export default class Generator {
    constructor() {
        this.headerText = '';
        this.mainText = '';
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
