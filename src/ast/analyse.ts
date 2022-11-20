import MagicString from "magic-string";
import { Module } from "../module";

export const analyse = (magicString: MagicString, module: Module) => {
  module.statements.forEach(statement => {
    statement.analyse();
  })
}
