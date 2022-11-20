import { Bundler } from "./bundler.js";
import acorn, { parse } from 'acorn';
import { moduleConfigInterface } from "./type.js";
import { Statement } from './statement.js';
import MagicString from 'magic-string';
import { isExportDeclaration, isImportDeclaration } from "./helper.js";
import { analyse } from "./ast/analyse.js";

export class Module {
  source: string;
  path: string;
  bundler: Bundler;
  magicString: MagicString;
  statements: Statement[];
  definitions: Map<string, Statement> = new Map();
  importDeclarations: Statement[];
  exportDeclarations: Statement[];

  /**
   * @source 从哪个文件导入或者导出
   * @localName 该函数从导入导出的文件中的名字
   * @name 该函数导入导出的名字
  */
  imports: Record<string, { source: string, localName: string, name: string }> = {};
  exports: any = {};

  constructor(config: moduleConfigInterface) {
    this.source = config.source;
    this.path = config.path;
    this.bundler = config.bundler;

    this.magicString = new MagicString(this.source, {
      filename: this.path
    });

    const ast = parse(this.source, {
      ecmaVersion: 6,
      sourceType: 'module',
    });

    // @ts-ignore;
    this.statements = ast.body.map((node: acorn.Node) => {
      const magicString = this.magicString.snip(node.start, node.end);
      return new Statement(node, magicString, this);
    });

    this.importDeclarations = this.statements.filter(isImportDeclaration);
    this.exportDeclarations = this.statements.filter(isExportDeclaration);

    this.analyse();
  }

  analyse(): void {
    // 收集导入导出变量
    this.imports = {};
    this.exports = {};

    this.importDeclarations.forEach((statement) => {
      const node = statement.node as any;
      const source = node.source.value;

      node.specifiers.forEach((specifier: any) => {
        const isDefault = specifier.type === 'ImportDefaultSpecifier';
        const isNamespace = specifier.type === 'ImportNamespaceSpecifier';

        const localName = specifier.local.name;
        const name = isDefault ? 'default' : isNamespace ? '*' : specifier.imported.name;

        if (this.imports[localName]) {
          throw new Error(`Duplicated import '${localName}'`);
        }

        this.imports[localName] = {
          source,
          name,
          localName
        };
      });
    })

    this.exportDeclarations.forEach((statement) => {
      const node = statement.node as any;
      const source = node.source && node.source.value;

      // export default function foo () {}
      if (node.type === 'ExportDefaultDeclaration') {
        const isDeclaration = /Declaration$/.test(node.declaration.type);
        this.exports['default'] = {
          source,
          statement,
          name: 'default',
          localName: isDeclaration ? node.declaration.id.name : 'default',
          isDeclaration
        };
      }

      // export function test() {};
      else if (node.type === 'ExportNamedDeclaration') {
        if (node.specifiers.length) {
          node.specifiers.forEach((specifier: any) => {
            const localName = specifier.local.name;
            const exportedName = specifier.exported.name;

            this.exports[exportedName] = {
              localName,
              exportedName
            };

            // export { foo } from './foo';
            if (source) {
              this.imports[localName] = {
                source,
                localName,
                name: localName
              };
            }
          })
        } else {
          let declaration = node.declaration;
          let name;
          if (declaration.type === 'VariableDeclaration') {
            // export var foo = 42
            name = declaration.declarations[0].id.name;
          } else {
            // export function foo () {}
            name = declaration.id.name;
          }

          this.exports[name] = {
            statement,
            localName: name,
            expression: declaration
          };
        }
      }
    })

    // 分析 statement，构建作用域
    analyse(this.magicString, this);

    // 收集所有语句定义的变量，建立变量和 statement 语句之间的对应关系
    this.statements.forEach(statement => {
      for (const define of statement.defines.keys()) {
        this.definitions.set(define, statement);
      }
    })
  }

  // 构建完成作用域之后，根据入口 module 的 defines 和 dependsOn 递归查找所有的引用 statement
  expandAllStatements() {
    const allStatements: Statement[] = []
    this.statements.forEach(statement => {
      if (statement.node.type === 'ImportDeclaration') return
      if (statement.node.type === 'ExportDeclaration') return;

      const statements = this.expandStatement(statement);
      allStatements.push(...statements);
    })
    return allStatements;
  }

  expandStatement(statement: Statement) {
    const result: Statement[] = [];
    const dependencies = statement.dependsOn.keys();
    for (const dep of dependencies) {
      const definition = this.define(dep);
      result.push(...definition);
    }
    result.push(statement);
    return result;
  }

  define(name: string): any {
    // 当前 module 的 imports 中导入该变量时，递归创建引用的 module 来收集 statement
    if (this.imports[name]) {
      const path = this.imports[name].source;
      const mod = this.bundler.fetchModule(path, this.path);
      const exportDeclaration = mod.exports[this.imports[name].name];
      return mod.define(exportDeclaration.localName);
    } else {
      const statement = this.definitions.get(name);
      if (statement) return this.expandStatement(statement);
      return [];
    }
  }
}
