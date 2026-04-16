const crypto = require('crypto');
const start = Date.now();
for (let i = 0; i < 10; i++) {
  crypto.pbkdf2('a', 'b', 10000, 512, 'sha512', () => {
    console.log(`Task ${i + 1}:`, Date.now() - start);
  });
}