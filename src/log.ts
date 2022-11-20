import chalk from 'chalk';

export const log = (msg: string) => {
  console.log(chalk.bgGreen(msg));
}
