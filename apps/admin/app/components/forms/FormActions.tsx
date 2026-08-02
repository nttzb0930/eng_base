import { LoaderCircle } from "lucide-react";

import { Button } from "@/app/components/ui/button";

type FormActionsProps = {
  cancelLabel?: string;
  isSubmitting?: boolean;
  onCancel(): void;
  submitLabel: string;
};

export function FormActions({
  cancelLabel = "Hủy",
  isSubmitting = false,
  onCancel,
  submitLabel,
}: FormActionsProps) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
      <Button onClick={onCancel} type="button" variant="outline">
        {cancelLabel}
      </Button>
      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : null}
        {submitLabel}
      </Button>
    </div>
  );
}
