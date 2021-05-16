import {
    valueTypes,
    comparisonTypes
} from './constants.js';

export const typeMap = {
    [valueTypes.FLOAT]: 'float',
    [valueTypes.INT]: 'i32',
    [valueTypes.DOUBLE]: 'double'
};

export const stringInputMap = {
    [valueTypes.FLOAT]: '@.strinfloat',
    [valueTypes.INT]: '@.strinint'
}

export const stringOutputMap = {
    [valueTypes.DOUBLE]: '@.stroutfloat',
    [valueTypes.INT]: '@.stroutint'
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

export const comparisonMaps = {
    [comparisonTypes.EQ]: {
        [valueTypes.FLOAT]: 'fcmp oeq',
        [valueTypes.INT]: 'icmp eq'
    },
    [comparisonTypes.NEQ]: {
        [valueTypes.FLOAT]: 'fcmp une',
        [valueTypes.INT]: 'icmp neq'
    },
    [comparisonTypes.GT]: {
        [valueTypes.FLOAT]: 'fcmp ogt',
        [valueTypes.INT]: 'icmp sgt'
    },
    [comparisonTypes.GTEQ]: {
        [valueTypes.FLOAT]: 'fcmp oge',
        [valueTypes.INT]: 'icmp sge'
    },
    [comparisonTypes.LT]: {
        [valueTypes.FLOAT]: 'fcmp olt',
        [valueTypes.INT]: 'icmp slt'
    },
    [comparisonTypes.LTEQ]: {
        [valueTypes.FLOAT]: 'fcmp ole',
        [valueTypes.INT]: 'icmp sle'
    }
}
