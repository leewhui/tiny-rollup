import acorn from "acorn";
import MagicString from 'magic-string';
import { Scope } from "./ast/scope";
import { Bundler } from "./bundler";
import { Module } from "./module";

// rollup 的配置参数
export interface rollupConfigInterface {
  entry: string; // 入口文件
  output?: string; // 出口文件，非必须
}

// 模块的配置参数，rollup中一个带解析的文件就作为一个模块进行操作
export interface moduleConfigInterface {
  source: string; // 模块中的代码
  path: string; // 该模块(文件)的路径
  bundler: Bundler; // bundler实例
}

// statement的配置参数，statement由一个模块中的代码组成，用来进行进行作用域的依赖追踪
export interface statementConfigInterface {
  node: acorn.Node; // 这个 statement 对应的 ast节点
  source: MagicString; // 对应的代码
  module: Module;
}

// 作用域的参数
export interface scopeConfigInterface {
  parent?:  Scope | null; // 父级作用域
  depth?: number; // 作用域嵌套深度
  isBlockScope?: boolean; // 是否是块级作用域
  names?: string[]; // 作用域中定义的变量
}
