async function f () {
    console.log('a');
    let b = await Promise.resolve('3');
    console.log(b);
};
f();