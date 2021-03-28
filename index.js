import Main from './src/logic/main.js';
import { fileText } from './src/utils/fileReader.js';

const [runtime, script, ...params] = process.argv;

const fileParam = params
    .find(param => /^--file=[a-zA-Z\.\/]+$/.test(param));

const file = fileParam ? fileParam.substring(7) : './example.bs';

const text = fileText(file);

new Main(text);
