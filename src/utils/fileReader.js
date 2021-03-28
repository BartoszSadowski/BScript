import fs from 'fs';

export function fileText(file) {
    try {
        const data = fs.readFileSync(file, 'utf8');
        return data;
    } catch (err) {
        console.error(err);
    }
}
