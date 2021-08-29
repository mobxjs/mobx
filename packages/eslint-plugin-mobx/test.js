const esquery = require('esquery');
const parser = require('@typescript-eslint/parser');
const { visitorKeys } = require('@typescript-eslint/visitor-keys');

const code = `
class C extends A {     
  @dec1 a() {}   
}
`
const ast = parser.parse(code);
const selector = esquery.parse('ClassDeclaration Decorator');
const decorator = ast.body[0].body.body[0].decorators[0];
console.log(esquery.matches(decorator, selector, ast, { visitorKeys }));
console.log(esquery.match(ast, selector, { visitorKeys }));

