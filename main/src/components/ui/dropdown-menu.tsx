import type { ComponentProps } from 'react';
import { DropdownMenu as Menu } from 'radix-ui';
import { cn } from '@/lib/utils';

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;
export const DropdownMenuGroup = Menu.Group;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof Menu.Content>) {
  return (
    <Menu.Portal>
      <Menu.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-44 max-w-[calc(100vw-2rem)] rounded-lg border bg-popover p-1 text-popover-foreground shadow-md outline-none',
          className,
        )}
        {...props}
      />
    </Menu.Portal>
  );
}

export function DropdownMenuItem({
  className,
  variant = 'default',
  ...props
}: ComponentProps<typeof Menu.Item> & { variant?: 'default' | 'destructive' }) {
  return (
    <Menu.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      className={cn(
        'flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm outline-none select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[variant=destructive]:text-destructive [&_svg]:size-4 [&_svg]:shrink-0',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator(props: ComponentProps<typeof Menu.Separator>) {
  return <Menu.Separator data-slot="dropdown-menu-separator" className="my-1 h-px bg-border" {...props} />;
}
