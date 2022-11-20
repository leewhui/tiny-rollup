import { Statement } from "./statement";
import path from 'path';

export const isImportDeclaration = (statement: Statement) => {
  return statement.isImportDeclaration;
}

export const isExportDeclaration = (statement: Statement) => {
  return statement.isExportDeclaration;
}

export const getName = (node: any) => {
  return node.name
}

export function defaultResolver(importee: string, importer: string) {
  return path.join(path.dirname(importee), importer);
}
