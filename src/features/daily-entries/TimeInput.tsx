import { forwardRef, type InputHTMLAttributes } from 'react';
import { maskHMInput } from '@/lib/time';
import { Input } from '@/components/ui/Input';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}

export const TimeInput = forwardRef<HTMLInputElement, Props>(
  ({ label, value, onChange, error, ...rest }, ref) => (
    <Input
      ref={ref}
      label={label}
      inputMode="numeric"
      placeholder="HH:mm"
      maxLength={5}
      value={value}
      error={error}
      onChange={e => onChange(maskHMInput(e.target.value))}
      {...rest}
    />
  ),
);
TimeInput.displayName = 'TimeInput';
