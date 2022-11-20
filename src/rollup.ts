import { Bundler } from "./bundler.js";
import { rollupConfigInterface } from "./type.js";

export const rollup = (options: rollupConfigInterface) => {
  // 1: 打包器实例，根据config参数进行初始化
  const bundler = new Bundler(options);
  // 2: 调用 build 方法，开始构建依赖图
  bundler.build();
}
