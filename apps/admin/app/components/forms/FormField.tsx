import { Label } from "@/app/components/ui/label";

type FormFieldProps = {
  children: React.ReactNode;
  description?: string;
  error?: string;
  htmlFor: string;
  label: string;
  required?: boolean;
};

export function FormField({
  children,
  description,
  error,
  htmlFor,
  label,
  required = false,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        ) : null}
      </Label>
      {children}
      {description ? (
        <p
          className="text-xs font-normal text-muted-foreground"
          id={`${htmlFor}-description`}
        >
          {description}
        </p>
      ) : null}
      {error ? (
        <p
          className="text-xs font-normal text-destructive"
          id={`${htmlFor}-error`}
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
