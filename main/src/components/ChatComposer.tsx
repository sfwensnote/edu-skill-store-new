import { ArrowUp } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function ChatComposer({
  id,
  value,
  onChange,
  onSend,
  label,
  sendLabel = '发送',
  placeholder,
  maxLength,
  disabled = false,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  label: string;
  sendLabel?: string;
  placeholder: string;
  maxLength?: number;
  disabled?: boolean;
}) {
  const canSend = !disabled && Boolean(value.trim());
  const inputRef = useRef<HTMLTextAreaElement>(null);
  return (
    <form
      className="chat-composer"
      aria-label="对话输入区"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) {
          onSend();
          inputRef.current?.focus();
        }
      }}
    >
      <Textarea
        ref={inputRef}
        id={id}
        aria-label={label}
        placeholder={placeholder}
        value={value}
        minRows={1}
        maxRows={8}
        maxLength={maxLength}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          // 中文输入法确认候选词时，不应触发发送。
          if (event.nativeEvent.isComposing || event.keyCode === 229) return;
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (canSend) onSend();
          }
        }}
      />
      <div className="chat-composer-actions">
        <Button
          type="submit"
          size="icon"
          disabled={!canSend}
          aria-label={sendLabel}
          title="回车发送，Shift+回车换行"
        >
          <ArrowUp />
        </Button>
      </div>
    </form>
  );
}
