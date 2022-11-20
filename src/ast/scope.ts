import { scopeConfigInterface } from "../type";

export class Scope {
  parent: Scope | null; // 父级作用域
  depth: number; // 作用域嵌套深度
  isBlockScope: boolean; // 是否是块级作用域
  names: string[]; // 作用域中定义的变量

  constructor(config?: scopeConfigInterface) {
    this.parent = config?.parent || null;
    this.depth = this.parent ? this.parent.depth + 1 : 0;
    this.isBlockScope = typeof config?.isBlockScope === 'boolean' ? config?.isBlockScope : false;
    this.names = config?.names || [];
  }

  add(name: string, isBlockDeclaration: boolean) {
    if (!isBlockDeclaration && this.isBlockScope && this.parent) {
      this.parent.add(name, isBlockDeclaration);
    } else {
      this.names.push(name);
    }
  }

  contains(name: string) {
    return !!this.findDefiningScope(name);
  }

  findDefiningScope(name: string): Scope | null {
    if (this.names.indexOf(name) !== -1) {
      return this;
    }

    if (this.parent) {
      return this.parent.findDefiningScope(name);
    }

    return null;
  }
}
