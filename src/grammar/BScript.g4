// Grammar for my language

grammar BScript;

start : (stat? NEWLINE)* EOF ;

// Statement list
stat: define
    | out 
    | input 
    | set ;

// Statememnts
define : definition ID ;

out : STD_OUT expr ;

input : STD_IN ID 
    | STD_IN array_id ;

set : array_id SET expr 
    | ID SET expr;

// Expresions
expr: expr op=(MUL | DIV) expr
    | expr op=(ADD | SUB) expr
    | value
    | OP_BRACKETS expr CL_BRACKETS ;

// Possible values
value : array_id
    | ID
    | INT
    | FLOAT ;

// Possible types
definition : INT_DEF
    | FLOAT_DEF 
    | array_def ;

// Key words
STD_OUT : 'wypisz' ;
STD_IN : 'wczytaj' ;

INT_DEF : '(C)' ;
FLOAT_DEF : '(R)' ;
array_def : '[' type=(INT_DEF | FLOAT_DEF) ']' '<' INT '>' ;

SET : 'to'
    | '=' ;
MUL : '*' ;
DIV : '/' ;
ADD : '+' ;
SUB : '-' ;

OP_BRACKETS : '(' ;
CL_BRACKETS : ')' ;


// variable name
array_id : ID '[' INT ']' ;
ID : [a-zA-Z][a-zA-Z]* ;

// data types
INT : [0-9]+ ;
FLOAT : INT'.'INT ;

// other
WS : [ \t]+ -> skip ; // skip white chars
NEWLINE : '\r'? '\n' ;
