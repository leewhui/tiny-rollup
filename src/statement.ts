import acorn from "acorn";
import { Module } from "./module";
import { statementConfigInterface } from "./type";
import MagicString from 'magic-string';
import { Scope } from "./ast/scope.js";
import { walk } from './ast/walk.js';
import { getName } from "./helper.js";

export class Statement implements statementConfigInterface {
  node: acorn.Node;
  source: MagicString;
  module: Module;
  isImportDeclaration: boolean;
  isExportDeclaration: boolean;
  scope: Scope;
  defines: Set<string> = new Set(); // 该 statement 中定义的变量声明等
  dependsOn: Set<string> = new Set(); // 该 statement 引用的外部变量

  constructor(node: acorn.Node, source: MagicString, module: Module) {
    this.node = node;
    this.source = source;
    this.module = module;
    this.scope = new Scope();

    this.isImportDeclaration = node.type === 'ImportDeclaration';
    this.isExportDeclaration = /^Export/.test(node.type);
  }

  // 分析 statement，构建作用域
  analyse() {
    if (this.isImportDeclaration) return;
    const statement = this;

    // 该变量记录当前的作用域
    let scope = this.scope;

    const addToScope = (declarator: any, isBlockScope: boolean) => {
      const name = declarator.id.name;
      scope.add(name, isBlockScope);
      if (!this.scope.parent) {
        statement.defines.add(name)
      }
    }

    // 遍历当前statement中的ast节点，创建作用域，以及收集变量声明
    walk(this.node, {
      enter: (node: any) => {
        let newScope;
        switch (node.type) {
          case 'FunctionDeclaration':
            addToScope(node, false);
            break;
          case 'BlockStatement':
            newScope = new Scope({
              parent: scope,
              isBlockScope: true
            });
            break;

          case 'CatchClause':
            newScope = new Scope({
              parent: scope,
              names: [node.param.name],
              isBlockScope: true
            });
            break;

          case 'VariableDeclaration':
            node.declarations.forEach((variableDeclarator: any) => {
              if (node.kind === 'let' || node.kind === 'const') {
                addToScope(variableDeclarator, true)
              } else {
                addToScope(variableDeclarator, false)
              }
            })
            break;

          case 'ClassDeclaration':
            addToScope(node, false);
            break;
        }
        if (newScope) {
          Object.defineProperty(node, '_scope', { value: newScope });
          scope = newScope; // 更新当前作用域
        }
      },
      leave(node: any) {
        if (node._scope && scope.parent) {
          scope = scope.parent; // 当 leave 的时候作用域为当前作用域的父级作用域
        }
      }
    })


    if (!this.isImportDeclaration) {
      // 再进行遍历，收集依赖
      walk(this.node, {
        enter: (node: any, parent: any) => {
          this.checkForRead(node, scope, parent);
          if (node._scope) scope = node._scope;
        },
        leave: (node: any) => {
          if (node._scope && scope.parent) scope = scope.parent;
        }
      });
    }
  }

  // 检查读取变量，根据作用域去查找是否在父级作用域中由定义，如果没有，则为外部定义变量
  private checkForRead(node: any, scope: Scope, parent: any) {
    if (node.type === 'Identifier') {
      // bar.foo 中 foo也为 Identifier 类型，需要去掉
      if (parent.type === 'MemberExpression' && parent.object !== node) return;
      const definedScope = scope.findDefiningScope(node.name);
      if (!definedScope) this.dependsOn.add(node.name);
    }
  }
}
