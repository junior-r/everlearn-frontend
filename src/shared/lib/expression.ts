/**
 * A small parser and evaluator of maths expressions ("2x^2 - sin(pi x)").
 * It never runs code: text becomes a tree of numbers, names, operators and
 * known functions, so an expression typed by someone else is safe to evaluate.
 */

export type AngleUnit = "rad" | "deg";

type Node =
  | { kind: "number"; value: number }
  | { kind: "name"; name: string }
  | { kind: "negate"; argument: Node }
  | { kind: "binary"; operator: "+" | "-" | "*" | "/" | "^"; left: Node; right: Node }
  | { kind: "call"; name: FunctionName; argument: Node }
  | { kind: "factorial"; argument: Node };

export type ExpressionErrorCode = "empty" | "syntax" | "unknownName" | "tooLong";

export interface ExpressionError {
  code: ExpressionErrorCode;
  /** The name that is not known, for `unknownName`. */
  name?: string;
}

export interface Expression {
  /** The variables the expression uses (constants and functions left out), in order of appearance. */
  variables: string[];
  /** The value for the given variables; NaN where the expression is undefined (a division by zero, √-1). */
  evaluate(scope?: Record<string, number>, angle?: AngleUnit): number;
}

export type Compiled = { ok: true; expression: Expression } | { ok: false; error: ExpressionError };

const MAX_LENGTH = 500;
const MAX_DEPTH = 64;
/** Above this, n! is larger than a double can hold. */
const MAX_FACTORIAL = 170;

const CONSTANTS: Record<string, number> = { pi: Math.PI, e: Math.E };

const FUNCTIONS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  ln: Math.log,
  log: Math.log10,
  log2: Math.log2,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
} as const;
type FunctionName = keyof typeof FUNCTIONS;

const TAKES_ANGLE = new Set<FunctionName>(["sin", "cos", "tan"]);
const GIVES_ANGLE = new Set<FunctionName>(["asin", "acos", "atan"]);

export const FUNCTION_NAMES = Object.keys(FUNCTIONS) as FunctionName[];

// Own keys only: "constructor" or "toString" must never reach the prototype
const isFunctionName = (name: string): name is FunctionName => Object.hasOwn(FUNCTIONS, name);
const isConstant = (name: string) => Object.hasOwn(CONSTANTS, name);

type Token =
  | { kind: "number"; value: number }
  | { kind: "name"; name: string }
  | { kind: "operator"; operator: "+" | "-" | "*" | "/" | "^" | "!" | "(" | ")" };

// Symbols a keypad or a keyboard may type, written the way the parser reads them
const SYMBOLS: Array<[RegExp, string]> = [
  [/π/g, "pi"],
  [/[×·]/g, "*"],
  [/÷/g, "/"],
  [/[−–]/g, "-"],
  [/√/g, "sqrt"],
];

class ParseFailure extends Error {
  constructor(readonly detail: ExpressionError) {
    super(detail.code);
  }
}

function tokenize(source: string): Token[] {
  let text = source;
  for (const [pattern, replacement] of SYMBOLS) {
    text = text.replace(pattern, replacement);
  }
  const tokens: Token[] = [];
  let index = 0;
  while (index < text.length) {
    const rest = text.slice(index);
    const space = /^\s+/.exec(rest);
    if (space) {
      index += space[0].length;
      continue;
    }
    // A decimal comma is accepted as well as a point: no function here takes two arguments
    const number = /^(\d+([.,]\d*)?|[.,]\d+)([eE][+-]?\d+)?/.exec(rest);
    if (number) {
      tokens.push({ kind: "number", value: Number(number[0].replace(",", ".")) });
      index += number[0].length;
      continue;
    }
    const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest);
    if (name) {
      tokens.push({ kind: "name", name: name[0] });
      index += name[0].length;
      continue;
    }
    const operator = rest[0];
    if ("+-*/^!()".includes(operator)) {
      tokens.push({ kind: "operator", operator: operator as "+" });
      index += 1;
      continue;
    }
    throw new ParseFailure({ code: "syntax" });
  }
  return tokens;
}

/** Recursive descent, from the loosest binding (+ -) to the tightest (! and calls). */
class Parser {
  private position = 0;
  private depth = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): Node {
    const node = this.additive();
    if (this.position < this.tokens.length) {
      throw new ParseFailure({ code: "syntax" });
    }
    return node;
  }

  private peek(): Token | undefined {
    return this.tokens[this.position];
  }

  private isOperator(...operators: string[]): boolean {
    const token = this.peek();
    return token?.kind === "operator" && operators.includes(token.operator);
  }

  private take(): Token {
    const token = this.tokens[this.position];
    if (!token) {
      throw new ParseFailure({ code: "syntax" });
    }
    this.position += 1;
    return token;
  }

  private nested<T>(parse: () => T): T {
    this.depth += 1;
    if (this.depth > MAX_DEPTH) {
      throw new ParseFailure({ code: "tooLong" });
    }
    try {
      return parse();
    } finally {
      this.depth -= 1;
    }
  }

  private additive(): Node {
    let node = this.multiplicative();
    while (this.isOperator("+", "-")) {
      const operator = (this.take() as { operator: "+" | "-" }).operator;
      node = { kind: "binary", operator, left: node, right: this.multiplicative() };
    }
    return node;
  }

  /** Starts a factor that is multiplied without a sign: "2x", "3(x+1)", "x sin(x)". */
  private startsImplicitFactor(): boolean {
    const token = this.peek();
    return token?.kind === "number" || token?.kind === "name" || this.isOperator("(");
  }

  private multiplicative(): Node {
    let node = this.unary();
    for (;;) {
      if (this.isOperator("*", "/")) {
        const operator = (this.take() as { operator: "*" | "/" }).operator;
        node = { kind: "binary", operator, left: node, right: this.unary() };
      } else if (this.startsImplicitFactor()) {
        node = { kind: "binary", operator: "*", left: node, right: this.power() };
      } else {
        return node;
      }
    }
  }

  private unary(): Node {
    if (this.isOperator("-")) {
      this.take();
      return this.nested(() => ({ kind: "negate", argument: this.unary() }));
    }
    if (this.isOperator("+")) {
      this.take();
      return this.nested(() => this.unary());
    }
    return this.power();
  }

  private power(): Node {
    const base = this.postfix();
    if (this.isOperator("^")) {
      this.take();
      // Right associative, and the exponent may carry its own sign: 2^-1, 2^3^2
      return this.nested(() => ({ kind: "binary", operator: "^", left: base, right: this.unary() }));
    }
    return base;
  }

  private postfix(): Node {
    let node = this.primary();
    while (this.isOperator("!")) {
      this.take();
      node = { kind: "factorial", argument: node };
    }
    return node;
  }

  private primary(): Node {
    const token = this.take();
    if (token.kind === "number") {
      return { kind: "number", value: token.value };
    }
    if (token.kind === "name") {
      if (isFunctionName(token.name)) {
        if (!this.isOperator("(")) {
          throw new ParseFailure({ code: "syntax" });
        }
        this.take();
        const argument = this.nested(() => this.additive());
        this.closeParenthesis();
        return { kind: "call", name: token.name, argument };
      }
      return { kind: "name", name: token.name };
    }
    if (token.operator === "(") {
      const inner = this.nested(() => this.additive());
      this.closeParenthesis();
      return inner;
    }
    throw new ParseFailure({ code: "syntax" });
  }

  private closeParenthesis(): void {
    if (!this.isOperator(")")) {
      throw new ParseFailure({ code: "syntax" });
    }
    this.take();
  }
}

function factorial(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > MAX_FACTORIAL) {
    return Number.NaN;
  }
  let result = 1;
  for (let factor = 2; factor <= value; factor += 1) {
    result *= factor;
  }
  return result;
}

function evaluateNode(node: Node, scope: Record<string, number>, angle: AngleUnit): number {
  switch (node.kind) {
    case "number":
      return node.value;
    case "name":
      if (Object.hasOwn(scope, node.name)) {
        return scope[node.name];
      }
      return isConstant(node.name) ? CONSTANTS[node.name] : Number.NaN;
    case "negate":
      return -evaluateNode(node.argument, scope, angle);
    case "factorial":
      return factorial(evaluateNode(node.argument, scope, angle));
    case "call": {
      let argument = evaluateNode(node.argument, scope, angle);
      if (angle === "deg" && TAKES_ANGLE.has(node.name)) {
        argument = (argument * Math.PI) / 180;
      }
      const result = FUNCTIONS[node.name](argument);
      return angle === "deg" && GIVES_ANGLE.has(node.name) ? (result * 180) / Math.PI : result;
    }
    case "binary": {
      const left = evaluateNode(node.left, scope, angle);
      const right = evaluateNode(node.right, scope, angle);
      switch (node.operator) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return right === 0 ? Number.NaN : left / right;
        case "^":
          return left ** right;
      }
    }
  }
}

function collectNames(node: Node, into: string[]): void {
  switch (node.kind) {
    case "name":
      if (!isConstant(node.name) && !into.includes(node.name)) {
        into.push(node.name);
      }
      return;
    case "number":
      return;
    case "binary":
      collectNames(node.left, into);
      collectNames(node.right, into);
      return;
    default:
      collectNames(node.argument, into);
  }
}

/**
 * Reads an expression. `allowed`, when given, lists the only variables it may
 * use; any other name is reported as unknown.
 */
export function compile(source: string, allowed?: readonly string[]): Compiled {
  if (source.length > MAX_LENGTH) {
    return { ok: false, error: { code: "tooLong" } };
  }
  if (!source.trim()) {
    return { ok: false, error: { code: "empty" } };
  }
  try {
    const tree = new Parser(tokenize(source)).parse();
    const variables: string[] = [];
    collectNames(tree, variables);
    const unknown = allowed ? variables.find((name) => !allowed.includes(name)) : undefined;
    if (unknown) {
      return { ok: false, error: { code: "unknownName", name: unknown } };
    }
    return {
      ok: true,
      expression: {
        variables,
        evaluate: (scope = {}, angle = "rad") => evaluateNode(tree, scope, angle),
      },
    };
  } catch (failure) {
    if (failure instanceof ParseFailure) {
      return { ok: false, error: failure.detail };
    }
    throw failure;
  }
}
