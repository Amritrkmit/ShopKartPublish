const { spawn } = require('child_process');
const fs = require('fs');

const logFile = fs.createWriteStream('debug_server.log');

console.log('Starting server...');
const server = spawn('node', ['server.js']);

server.stdout.pipe(logFile);
server.stderr.pipe(logFile);

server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    process.exit(0);
});

// Kill after 15 seconds if still running
setTimeout(() => {
    console.log('Server still running after 15s. Killing...');
    server.kill();
    process.exit(0);
}, 15000);
