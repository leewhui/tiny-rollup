import { rollupConfigInterface } from "./type.js";
import fs from 'fs';
import { Module } from "./module.js";
import { defaultResolver } from './helper.js';
import { Statement } from "./statement.js";

export class Bundler {
  entry: string;
  // 模块的集合，路径 => 模块实例
  modules: Record<string, Module> = {};

  constructor(options: rollupConfigInterface) {
    this.entry = options.entry;
  }

  build() {
    // 3: 构建开始，从入口文件开始分析依赖关系
    const entryModule = this.fetchModule(this.entry, null)
    const statements = entryModule.expandAllStatements();
    const code = this.generate(statements);
    console.log(code);
  }

  /**
   * @var importee: 当前需要解析的文件的路径
   * @var importer: 引用当前需要解析的文件的文件的路径
   * fetchModule用来创建一个文件的 Module 实例，这个带解析的文件路径通过解析 importee 和 importer 而来
   */
  fetchModule(importee: string, importer: string | null) {
    const id = importer === null ? importee : defaultResolver(importer, importee);
    if (this.modules[id]) return this.modules[id];
    const content = fs.readFileSync(id, 'utf8');
    return this.modules[id] = new Module({ source: content, path: id, bundler: this });
  }

  generate(statements: Statement[]) {
    let code = ''
    statements.forEach(statement => {
      let source = statement.source;
      // @ts-ignore
      if (statement.node.type === 'ExportNamedDeclaration' && statement.node.declaration.id) {
        // @ts-ignore
        source.remove(statement.node.start, statement.node.declaration.start);
      }

      code += `${source.toString()}\n`;
    })
    return code;
  }
}
