// Grammar for my language

grammar BScript;

start : (stat? NEWLINE)* EOF ;

// Statement list
stat: define
    | out 
    | input 
    | set ;

// Statememnts
define : definition ID;

out : STD_OUT expr ;

input : STD_IN ID ;

set : ID SET expr ;

// Expresions
expr: expr op=(MUL | DIV) expr
    | expr op=(ADD | SUB) expr
    | value
    | OP_BRACKETS expr CL_BRACKETS ;

// Possible values
value : ID
    | INT
    | FLOAT ;

// Possible types
definition : INT_DEF
    | FLOAT_DEF ;

// Key words
STD_OUT : 'wypisz' ;
STD_IN : 'wczytaj' ;

INT_DEF : '(C)' ;
FLOAT_DEF : '(R)' ;

SET : 'to'
    | '=' ;
MUL : '*' ;
DIV : '/' ;
ADD : '+' ;
SUB : '-' ;

OP_BRACKETS : '(' ;
CL_BRACKETS : ')' ;


// variable name
ID : [a-zA-Z][a-zA-Z]* ;

// data types
INT : [0-9]+ ;
FLOAT : INT'.'INT ;

// other
WS : [ \t]+ -> skip ; // skip white chars
NEWLINE : '\r'? '\n' ;
