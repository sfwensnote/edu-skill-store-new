import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAccount } from './AccountProvider';

export function AccountMenu({ onMine }: { onMine: () => void }) {
  const { account, accounts, logout, setDisabled } = useAccount();
  const [manage, setManage] = useState(false);
  const [error, setError] = useState('');
  return <>
    <DropdownMenu><DropdownMenuTrigger asChild><button className="teacher-avatar" aria-label="打开账号菜单" title={`${account.name}（${account.role === 'admin' ? '管理员' : '教师'}）`}>{account.role === 'admin' ? '管' : '师'}</button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <p className="account-menu-name">{account.name}<small>{account.role === 'admin' ? '管理员' : '教师'}</small></p>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={onMine}>我的 SKILL</DropdownMenuItem>
          {account.role === 'admin' && <DropdownMenuItem onSelect={() => { setError(''); setManage(true); }}>账号管理</DropdownMenuItem>}
          <DropdownMenuItem onSelect={event => { event.preventDefault(); void Promise.resolve().then(logout).catch(failure => setError(failure instanceof Error ? failure.message : '退出失败，请重试。')); }}>退出登录</DropdownMenuItem>
        </DropdownMenuGroup>
        {error && !manage && <p className="account-error account-menu-error" role="alert">{error}</p>}
      </DropdownMenuContent>
    </DropdownMenu>
    {account.role === 'admin' && <Dialog open={manage} onOpenChange={setManage}>
      <DialogContent className="account-management">
        <DialogHeader><DialogTitle>教师账号</DialogTitle><DialogDescription>停用账号会保留教师的 SKILL，启用后可继续使用。</DialogDescription></DialogHeader>
        {error && <p className="account-error" role="alert">{error}</p>}
        <ul className="account-list">{accounts.filter(a => a.role === 'teacher').map(teacher => <li key={teacher.id}>
          <div><strong>{teacher.name}</strong><span>{teacher.login}</span><small>{teacher.disabled ? '已停用' : '正常'}</small></div>
          <Button variant="outline" size="sm" onClick={() => {
            void Promise.resolve().then(() => setDisabled(teacher.id, !teacher.disabled)).then(() => setError(''))
              .catch(failure => setError(failure instanceof Error ? failure.message : '账号设置未保存，请重试。'));
          }}>{teacher.disabled ? '启用' : '停用'}</Button>
        </li>)}</ul>
      </DialogContent>
    </Dialog>}
  </>;
}
