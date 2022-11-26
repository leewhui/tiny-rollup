import { sayHello, sayBye } from './second.js';

function test() {
	sayHello();
	const a = 1;
	console.log('hello world', a);

  function foo() {
    const b = 1;
    console.log(a);
  }
}

test();
