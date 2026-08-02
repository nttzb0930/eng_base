"use client";

import { AlertTriangle, LoaderCircle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";

type DestructiveActionDialogProps = {
  confirmLabel?: string;
  description?: string;
  isPending?: boolean;
  onConfirm(): void | Promise<void>;
  onOpenChange(open: boolean): void;
  open: boolean;
  resourceName: string;
  title?: string;
};

export function DestructiveActionDialog({
  confirmLabel = "Xóa",
  description,
  isPending = false,
  onConfirm,
  onOpenChange,
  open,
  resourceName,
  title = "Xác nhận xóa",
}: DestructiveActionDialogProps) {
  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <AlertTriangle aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? (
              <>
                Bạn sắp xóa <strong className="font-medium text-foreground">{resourceName}</strong>.
                Thao tác này không thể hoàn tác.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              void onConfirm();
            }}
            variant="destructive"
          >
            {isPending ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
