// Grammar for my language

grammar BScript;

start : 'echo' STRING ;

STRING : '"'[a-zA-Z]+'"' ;

WS : [ \t\r\n]+ -> skip ; // skip white chars
