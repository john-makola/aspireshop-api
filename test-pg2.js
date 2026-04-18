const net = require('net');

const host = 'nozomi.proxy.rlwy.net';
const port = 39962;

function buildStartupMessage(user, database) {
  const params = `user\0${user}\0database\0${database}\0\0`;
  const len = 4 + 4 + Buffer.byteLength(params);
  const buf = Buffer.alloc(len);
  buf.writeInt32BE(len, 0);
  buf.writeInt32BE(196608, 4); // protocol 3.0
  buf.write(params, 8);
  return buf;
}

const client = new net.Socket();
client.setTimeout(10000);

client.connect(port, host, () => {
  console.log('TCP connected, sending startup...');
  const msg = buildStartupMessage('postgres', 'railway');
  client.write(msg);
});

client.on('data', (data) => {
  const tag = String.fromCharCode(data[0]);
  console.log('Response tag:', tag);
  console.log('Hex:', data.toString('hex').substring(0, 200));
  if (tag === 'R') {
    const authType = data.readInt32BE(5);
    console.log('Auth type:', authType);
    // 0=ok, 3=cleartext, 5=md5, 10=SASL
    if (authType === 5) console.log('MD5 auth required (Postgres is alive!)');
    if (authType === 10) console.log('SCRAM-SHA-256 auth required (Postgres is alive!)');
    if (authType === 3) console.log('Cleartext auth required (Postgres is alive!)');
  } else if (tag === 'E') {
    console.log('Error from server:', data.toString('utf8', 5));
  }
  client.destroy();
});

client.on('timeout', () => {
  console.log('Timed out waiting for response');
  client.destroy();
});

client.on('error', (err) => {
  console.error('Error:', err.message);
});

client.on('close', () => {
  process.exit(0);
});
