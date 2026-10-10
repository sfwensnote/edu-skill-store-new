import { Textarea } from '@/components/ui/textarea';
import { useState, type ComponentProps } from 'react';

type Props = ComponentProps<typeof Textarea> & {
  value: string;
  errorMessage?: string;
  submitted?: boolean;
};

export function MethodTextField({ errorMessage, submitted, onBlur, ...props }: Props) {
  const [touched, setTouched] = useState(false);
  const invalid = Boolean(props.required && !props.value.trim() && (touched || submitted));

  return (
    <div className="method-text-field" data-invalid={invalid || undefined}>
      <Textarea
        {...props}
        rows={props.rows ?? 2}
        aria-invalid={invalid}
        aria-describedby={invalid ? `${props.id}-error` : props['aria-describedby']}
        onBlur={(event) => {
          setTouched(true);
          onBlur?.(event);
        }}
      />
      {invalid && (
        <p className="field-error" id={`${props.id}-error`} role="alert">
          {errorMessage || '请填写此项。'}
        </p>
      )}
    </div>
  );
}
