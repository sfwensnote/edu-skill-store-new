import { z } from 'zod';

export const accountsKey = 'teaching-method.local-accounts.v1';
export const accountSessionKey = 'teaching-method.account-session.v1';
export const primaryTeacherId = 'demo-teacher';
export type AccountStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const accountSchema = z.object({
  id: z.string().min(1), login: z.string().min(3).max(40), name: z.string().min(1).max(30),
  role: z.enum(['teacher', 'admin']), disabled: z.boolean(),
  salt: z.string().regex(/^[a-f0-9]{32}$/), hash: z.string().regex(/^[a-f0-9]{64}$/),
});
export type LocalAccount = z.infer<typeof accountSchema>;
export type AccountIdentity = Pick<LocalAccount, 'id' | 'login' | 'name' | 'role' | 'disabled'>;
const credentials = z.object({
  login: z.string().trim().toLowerCase().regex(/^[a-z0-9_.@-]{3,40}$/),
  password: z.string().min(8).max(128),
});

// 仅用于浏览器内的登录演示；不能用于真实服务的认证或权限判断。
export const initialAccounts: LocalAccount[] = [
  { id: primaryTeacherId, login: 'teacher', name: '教师', role: 'teacher', disabled: false,
    salt: 'e3710a69caed2449bfd2de7da1bab411', hash: '1405b77025d4f76f280a3dd7d80122c21e00e2ea06c4ae5c0f14adfcc8bc2146' },
  { id: 'demo-admin', login: 'admin', name: '管理员', role: 'admin', disabled: false,
    salt: 'f720cb7e8c37c7c60c0242dcad0b61be', hash: '0f75928405da7a1a6e9ea99ed671c5dd054f930f784ada9bbb07c2b931c4a004' },
];
export function readAccounts(storage: AccountStorage): LocalAccount[] {
  const raw = storage.getItem(accountsKey);
  if (raw === null) return structuredClone(initialAccounts);
  try {
    const parsed = z.object({ version: z.literal(1), accounts: z.array(accountSchema).min(1) }).parse(JSON.parse(raw));
    if (new Set(parsed.accounts.map(a => a.id)).size !== parsed.accounts.length ||
      new Set(parsed.accounts.map(a => a.login)).size !== parsed.accounts.length) throw new Error();
    return parsed.accounts;
  } catch { throw new Error('账号资料无法读取，请检查浏览器存储后重试。'); }
}
export function identity(account: LocalAccount): AccountIdentity {
  const { salt: _salt, hash: _hash, ...user } = account;
  return user;
}
export function readAccountSession(storage: AccountStorage, sessions: AccountStorage, now = Date.now()): AccountIdentity | null {
  const raw = sessions.getItem(accountSessionKey);
  if (!raw) return null;
  let session: { accountId?: string; expires?: number };
  try { session = JSON.parse(raw); } catch { return null; }
  if (!session || typeof session.expires !== 'number' || session.expires <= now) return null;
  const account = readAccounts(storage).find(a => a.id === session.accountId && !a.disabled);
  return account ? identity(account) : null;
}
const hex = (bytes: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
async function passwordHash(password: string, salt: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 150000, hash: 'SHA-256' }, key, 256));
}
function saveSession(storage: AccountStorage, sessions: AccountStorage, account: LocalAccount) {
  const current = readAccounts(storage).find(a => a.id === account.id && !a.disabled);
  if (!current) throw new Error('此账号已停用，请联系管理员。');
  if (storage.getItem(accountsKey) === null)
    storage.setItem(accountsKey, JSON.stringify({ version: 1, accounts: readAccounts(storage) }));
  sessions.setItem(accountSessionKey, JSON.stringify({ accountId: current.id, expires: Date.now() + 8 * 3600000 }));
  return identity(current);
}
export async function loginAccount(storage: AccountStorage, sessions: AccountStorage, input: unknown) {
  const parsed = credentials.safeParse(input);
  if (!parsed.success) throw new Error('请输入正确的账号和密码。');
  const account = readAccounts(storage).find(a => a.login === parsed.data.login);
  if (!account || await passwordHash(parsed.data.password, account.salt) !== account.hash)
    throw new Error('账号或密码不正确。');
  if (account.disabled) throw new Error('此账号已停用，请联系管理员。');
  return saveSession(storage, sessions, account);
}
export async function registerTeacher(storage: AccountStorage, sessions: AccountStorage, input: unknown) {
  const parsed = credentials.extend({ name: z.string().trim().min(1).max(30) }).safeParse(input);
  if (!parsed.success) throw new Error('请填写姓名、3–40 位账号和至少 8 位密码。');
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await passwordHash(parsed.data.password, salt);
  const accounts = readAccounts(storage);
  if (accounts.some(a => a.login === parsed.data.login)) throw new Error('此账号已注册，请直接登录。');
  const account: LocalAccount = { id: crypto.randomUUID(), login: parsed.data.login, name: parsed.data.name,
    salt, hash, role: 'teacher', disabled: false };
  storage.setItem(accountsKey, JSON.stringify({ version: 1, accounts: [...accounts, account] }));
  try { return saveSession(storage, sessions, account); }
  catch { throw new Error('账号已创建，但登录状态未保存，请重新登录。'); }
}
export function setTeacherDisabled(storage: AccountStorage, sessions: AccountStorage, id: string, disabled: boolean) {
  if (readAccountSession(storage, sessions)?.role !== 'admin') throw new Error('仅管理员可以管理教师账号。');
  const accounts = readAccounts(storage);
  if (!accounts.some(a => a.id === id && a.role === 'teacher')) throw new Error('没有找到此教师账号。');
  storage.setItem(accountsKey, JSON.stringify({ version: 1, accounts: accounts.map(a => a.id === id ? { ...a, disabled } : a) }));
}
