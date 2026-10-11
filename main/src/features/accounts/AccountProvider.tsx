import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { accountSessionKey, identity, loginAccount, readAccounts, readAccountSession, registerTeacher,
  setTeacherDisabled, type AccountIdentity } from '../../../shared/local-accounts';
import { accountWorkspace, ownersStorageKey, type WorkspaceStorage } from '@/lib/account-workspace';
import { LoginPage } from './LoginPage';
import { goTo } from '@/lib/routes';
import './accounts.css';

type AccountContextValue = {
  account: AccountIdentity; storage: WorkspaceStorage; accounts: AccountIdentity[];
  logout: () => void; setDisabled: (id: string, disabled: boolean) => void;
};
const AccountContext = createContext<AccountContextValue | null>(null);
export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error('请先登录。');
  return value;
}
function storedAccount() {
  try {
    const account = readAccountSession(localStorage, sessionStorage);
    if (!account) sessionStorage.removeItem(accountSessionKey);
    return { account, error: '' };
  }
  catch { return { account: null, error: '浏览器未能读取登录状态，请检查存储权限后重试。' }; }
}
export function AccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(storedAccount);
  const failedKeys = useRef(new Set<string>());
  function refresh() { setSession(storedAccount()); }
  useEffect(() => {
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('focus', refresh); window.clearInterval(timer); };
  }, []);
  const accountId = session.account?.id;
  const storage = useMemo(() => {
    if (!accountId) return null;
    const personal = accountWorkspace(localStorage, accountId);
    function write(key: string, value?: string) {
      const retainedKey = key.startsWith(`${ownersStorageKey}.recovery:`) ? ownersStorageKey : key;
      try {
        if (readAccountSession(localStorage, sessionStorage)?.id !== accountId) throw new Error('登录已失效，请重新登录。');
        if (value === undefined) personal.removeItem(key); else personal.setItem(key, value);
        failedKeys.current.delete(retainedKey);
      } catch (error) {
        if (value !== undefined && !key.startsWith('teaching-assistant.check-progress:')) failedKeys.current.add(retainedKey);
        throw error;
      }
    }
    return { ...personal, get length() { return personal.length; },
      setItem: (key: string, value: string) => write(key, value), removeItem: (key: string) => write(key) };
  }, [accountId]);
  if (!session.account || !storage) return <LoginPage initialError={session.error} onLogin={async (login, password) => {
    const account = await loginAccount(localStorage, sessionStorage, { login, password });
    failedKeys.current.clear();
    goTo({ page: 'home' }, true);
    setSession({ account, error: '' });
  }} onRegister={async (name, login, password) => {
    const account = await registerTeacher(localStorage, sessionStorage, { name, login, password });
    failedKeys.current.clear();
    goTo({ page: 'home' }, true);
    setSession({ account, error: '' });
  }} />;
  let accounts: AccountIdentity[] = [];
  try { if (session.account.role === 'admin') accounts = readAccounts(localStorage).map(identity); } catch { /* 管理面板在读取失败时提供重试。 */ }
  const value: AccountContextValue = { account: session.account, storage, accounts,
    logout: () => {
      if (failedKeys.current.size) throw new Error('还有修改未保存，请保存成功后退出。');
      sessionStorage.removeItem(accountSessionKey);
      window.location.hash = '#/home';
      setSession({ account: null, error: '' });
    },
    setDisabled: (id, disabled) => { setTeacherDisabled(localStorage, sessionStorage, id, disabled); refresh(); },
  };
  return <AccountContext.Provider key={accountId} value={value}>{children}</AccountContext.Provider>;
}
