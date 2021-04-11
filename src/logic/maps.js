import {
    valueTypes
} from './constants.js';

export const typeMap = {
    [valueTypes.FLOAT]: 'float',
    [valueTypes.INT]: 'i32'
};

export const stringInputMap = {
    [valueTypes.FLOAT]: '@.strinfloat',
    [valueTypes.INT]: '@.strinint'
}

export const addMethodMap = {
    [valueTypes.FLOAT]: 'fadd',
    [valueTypes.INT]: 'add'
}

export const subMethodMap = {
    [valueTypes.FLOAT]: 'fsub',
    [valueTypes.INT]: 'sub'
}

export const mulMethodMap = {
    [valueTypes.FLOAT]: 'fmul',
    [valueTypes.INT]: 'mul'
}

export const divMethodMap = {
    [valueTypes.FLOAT]: 'fdiv',
    [valueTypes.INT]: 'sdiv'
}
