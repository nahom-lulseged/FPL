import { useEffect, useState } from 'react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';

export type FieldType =
  | 'text'
  | 'url'
  | 'number'
  | 'textarea'
  | 'checkbox'
  | 'select'
  | 'datetime-local';

export interface FieldSchema {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  step?: string;
  min?: number;
  numberFormat?: 'price';
}

interface GenericCrudFormProps {
  fields: FieldSchema[];
  initialValues: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(local: string): string {
  return new Date(local).toISOString();
}

function formatPriceDisplay(tenths: number): string {
  return (tenths / 10).toFixed(1);
}

function parsePriceInput(value: string): number {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.round(parsed * 10);
}

function toFormValues(
  fields: FieldSchema[],
  initialValues: Record<string, unknown>,
): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};

  for (const field of fields) {
    const raw = initialValues[field.name];

    if (field.type === 'checkbox') {
      values[field.name] = Boolean(raw);
      continue;
    }

    if (field.type === 'datetime-local' && typeof raw === 'string') {
      values[field.name] = toDatetimeLocalValue(raw);
      continue;
    }

    if (field.type === 'number' && field.numberFormat === 'price' && typeof raw === 'number') {
      values[field.name] = formatPriceDisplay(raw);
      continue;
    }

    if (raw === null || raw === undefined) {
      values[field.name] = '';
    } else {
      values[field.name] = String(raw);
    }
  }

  return values;
}

function validateFields(
  fields: FieldSchema[],
  values: Record<string, string | boolean>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = values[field.name];

    if (field.required) {
      if (field.type === 'checkbox') {
        continue;
      }
      if (typeof value !== 'string' || value.trim() === '') {
        errors[field.name] = 'Required';
      }
    }

    if (field.type === 'url' && typeof value === 'string' && value.trim() !== '') {
      try {
        new URL(value);
      } catch {
        errors[field.name] = 'Enter a valid URL';
      }
    }
  }

  return errors;
}

function toSubmitValues(
  fields: FieldSchema[],
  values: Record<string, string | boolean>,
): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const field of fields) {
    const value = values[field.name];

    if (field.type === 'checkbox') {
      output[field.name] = Boolean(value);
      continue;
    }

    if (typeof value !== 'string') {
      continue;
    }

    if (field.type === 'datetime-local') {
      if (value) {
        output[field.name] = fromDatetimeLocalValue(value);
      }
      continue;
    }

    if (field.type === 'number' && field.numberFormat === 'price') {
      if (value) {
        output[field.name] = parsePriceInput(value);
      }
      continue;
    }

    if (field.type === 'number') {
      if (value) {
        output[field.name] = Number(value);
      }
      continue;
    }

    if (field.type === 'url') {
      output[field.name] = value.trim() === '' ? null : value.trim();
      continue;
    }

    if (field.type === 'textarea' && field.name === 'injuryNote') {
      output[field.name] = value.trim() === '' ? null : value.trim();
      continue;
    }

    output[field.name] = value;
  }

  return output;
}

export function GenericCrudForm({
  fields,
  initialValues,
  onSubmit,
  isLoading = false,
  submitLabel = 'Save',
}: GenericCrudFormProps) {
  const [values, setValues] = useState(() => toFormValues(fields, initialValues));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setValues(toFormValues(fields, initialValues));
    setErrors({});
  }, [fields, initialValues]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateFields(fields, values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    onSubmit(toSubmitValues(fields, values));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => {
        if (field.type === 'checkbox') {
          return (
            <label key={field.name} className="flex items-center gap-2 text-sm text-fpl-gray-900">
              <input
                type="checkbox"
                checked={Boolean(values[field.name])}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.name]: event.target.checked }))
                }
                className="rounded border-fpl-gray-200"
              />
              {field.label}
            </label>
          );
        }

        if (field.type === 'textarea') {
          return (
            <label
              key={field.name}
              className="flex flex-col gap-1.5 text-sm font-medium text-fpl-gray-900"
            >
              {field.label}
              <textarea
                className="min-h-24 rounded-md border border-fpl-gray-200 bg-white px-3 py-2 text-sm text-fpl-gray-900 placeholder:text-fpl-gray-500 focus:border-fpl-purple focus:outline-none focus:ring-1 focus:ring-fpl-purple"
                value={String(values[field.name] ?? '')}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.name]: event.target.value }))
                }
              />
              {errors[field.name] ? (
                <span className="text-xs text-fpl-pink">{errors[field.name]}</span>
              ) : null}
            </label>
          );
        }

        if (field.type === 'select') {
          return (
            <div key={field.name} className="flex flex-col gap-1.5">
              <label htmlFor={field.name} className="text-sm font-medium text-fpl-gray-900">
                {field.label}
              </label>
              <select
                id={field.name}
                className="rounded-md border border-fpl-gray-200 bg-white px-3 py-2 text-sm text-fpl-gray-900"
                value={String(values[field.name] ?? '')}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.name]: event.target.value }))
                }
              >
                {(field.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors[field.name] ? (
                <span className="text-xs text-fpl-pink">{errors[field.name]}</span>
              ) : null}
            </div>
          );
        }

        return (
          <Input
            key={field.name}
            label={field.label}
            name={field.name}
            type={field.type === 'number' ? 'number' : field.type}
            step={field.step}
            min={field.min}
            value={String(values[field.name] ?? '')}
            error={errors[field.name]}
            onChange={(event) =>
              setValues((current) => ({ ...current, [field.name]: event.target.value }))
            }
          />
        );
      })}

      <Button type="submit" variant="primary" isLoading={isLoading}>
        {submitLabel}
      </Button>
    </form>
  );
}
