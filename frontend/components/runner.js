let num = 0;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
while(true) {
    process.stdout.write(num.toString() + '\n');  // Add newline
    num++;
    await sleep(1000);
}
