import 'dotenv/config';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { db } from './store';

// 密码由环境变量传入；不会写入源码、参数日志或输出。
const [login, name] = process.argv.slice(2);
const password = process.env.ADMIN_PASSWORD;
if (!login || !/^[A-Za-z0-9_.@-]{3,40}$/.test(login) || !name || !password || password.length < 12 || password.length > 128)
  throw new Error('用法：ADMIN_PASSWORD 由私有环境提供，npm run admin:create -- 账号 姓名。密码需12至128位。');
if (db.prepare('SELECT id FROM users WHERE email=?').get(login.toLowerCase())) throw new Error('账号已经存在，请选择新账号。');
const salt = randomBytes(16).toString('hex');
db.prepare('INSERT INTO users(id,email,name,hash,salt,role) VALUES(?,?,?,?,?,?)')
  .run(randomUUID(), login.toLowerCase(), name.slice(0, 50), scryptSync(password, salt, 64).toString('hex'), salt, 'admin');
db.close();
console.log('管理员账号已创建。');
