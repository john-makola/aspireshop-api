const net = require('net');

const client = new net.Socket();
client.setTimeout(10000);

client.connect(39962, 'nozomi.proxy.rlwy.net', () => {
  console.log('TCP connected!');
});

client.on('data', (data) => {
  console.log('Received:', data.toString('hex').substring(0, 100));
  console.log('As text:', data.toString('utf8').substring(0, 200));
  client.destroy();
});

client.on('timeout', () => {
  console.log('Connection timed out');
  client.destroy();
});

client.on('error', (err) => {
  console.error('Error:', err.message);
});

client.on('close', () => {
  console.log('Connection closed');
  process.exit(0);
});
