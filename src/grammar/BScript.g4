// Grammar for my language

grammar BScript;

start : 
    definitions function_definitions main EOF ;

definitions: (define? NEWLINE)* ;

function_definitions: (define_function? NEWLINE)* ;

main: (stat? NEWLINE)* ; 

// Statement list
stat: define
    | out
    | input
    | set 
    | condition
    | loop ;

define_function : 'funkcja' type=(INT_DEF | FLOAT_DEF) ID '[' (function_args)* ']' NEWLINE main 'zwraca' expr ;

function_args : (type=(INT_DEF | FLOAT_DEF) ID) (',' function_args)*
                | type=(INT_DEF | FLOAT_DEF) ID ;

args : value (',' args)*
    | value ;

// Statememnts
define : definition ID ;

out : STD_OUT expr ;

input : STD_IN ID 
    | STD_IN array_id ;

set : array_id SET expr 
    | ID SET expr;

condition: 'jezeli' '(' cond ')' NEWLINE main 'koniec' ;

loop: 'dopoki' '(' cond ')' NEWLINE main 'koniec' ;

// Expresions
expr: expr op=(MUL | DIV) expr
    | expr op=(ADD | SUB) expr
    | value
    | OP_BRACKETS expr CL_BRACKETS ;

cond : expr op=(EQUALS | NOT_EQUALS | GT | GTEQ | LT | LTEQ) expr ;

// Possible values
value : array_id
    | function_call
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

EQUALS : '==' ;
NOT_EQUALS : '!==' ;
LT : '<' ;
GT : '>' ;
LTEQ : '<=' ;
GTEQ : '>=' ;

OP_BRACKETS : '(' ;
CL_BRACKETS : ')' ;


// variable name
array_id : ID '[' INT ']' ;
function_call : ID '(' (args)* ')' ;
ID : [a-zA-Z][a-zA-Z]* ;

// data types
INT : [0-9]+ ;
FLOAT : INT'.'INT ;

// other
WS : [ \t]+ -> skip ; // skip white chars
NEWLINE : '\r'? '\n' ;
