import { type GoodLink, type UpdateLinkInput, updateLinkInputSchema } from "@caulk.lol/api/links";
import { Button } from "@caulk.lol/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@caulk.lol/ui/components/dialog";
import { Input } from "@caulk.lol/ui/components/input";
import { Label } from "@caulk.lol/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@caulk.lol/ui/components/native-select";
import { Separator } from "@caulk.lol/ui/components/separator";
import { Textarea } from "@caulk.lol/ui/components/textarea";
import { ExternalLinkIcon } from "lucide-react";
import { type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

type LinkEditDialogProps = {
  isPending: boolean;
  link: GoodLink | null;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, input: UpdateLinkInput, onSuccess: () => void) => void;
};

type LinkEditFormValues = {
  description: string | null;
  reason: string;
  status: string;
  tags: string[];
  title: string;
};

type LinkEditFormResult =
  | {
      ok: true;
      values: LinkEditFormValues;
    }
  | {
      ok: false;
      message: string;
    };

type RequiredFormValueResult =
  | {
      ok: true;
      value: string;
    }
  | {
      ok: false;
      message: string;
    };

export function LinkEditDialog({ isPending, link, onOpenChange, onUpdate }: LinkEditDialogProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!link) return;

    const values = readLinkEditFormValues(new FormData(event.currentTarget));
    if (!values.ok) {
      toast.error(values.message);
      return;
    }

    const parsed = updateLinkInputSchema.safeParse(values.values);
    if (!parsed.success) {
      toast.error(parsed.error.issues.map((issue) => issue.message).join(" "));
      return;
    }

    onUpdate(link.id, parsed.data, () => onOpenChange(false));
  }

  return (
    <Dialog open={link !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit link</DialogTitle>
          <DialogDescription>Update the published link copy shown on caulk.lol.</DialogDescription>
        </DialogHeader>

        {link ? (
          <form key={link.id} className="grid gap-4" onSubmit={submit}>
            <Separator />

            <Field label="URL">
              <div className="flex gap-2">
                <Input value={link.url} readOnly className="min-w-0 flex-1" />
                <Button
                  variant="outline"
                  size="icon"
                  render={<a href={link.url} target="_blank" rel="noreferrer" />}
                >
                  <ExternalLinkIcon />
                  <span className="sr-only">Open link</span>
                </Button>
              </div>
            </Field>

            <Field label="Title">
              <Input name="title" defaultValue={link.title} maxLength={160} required />
            </Field>

            <Field label="Description">
              <Textarea
                name="description"
                defaultValue={link.description ?? ""}
                placeholder="Leave empty to clear"
                maxLength={280}
              />
            </Field>

            <Field label="Reason">
              <Textarea name="reason" defaultValue={link.reason} maxLength={400} required />
            </Field>

            <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
              <Field label="Tags">
                <Input
                  name="tags"
                  defaultValue={link.tags.join(", ")}
                  placeholder="tools, writing"
                />
              </Field>
              <Field label="Status">
                <NativeSelect name="status" defaultValue={link.status} className="w-full">
                  <NativeSelectOption value="published">published</NativeSelectOption>
                  <NativeSelectOption value="draft">draft</NativeSelectOption>
                  <NativeSelectOption value="archived">archived</NativeSelectOption>
                </NativeSelect>
              </Field>
            </div>

            <DialogFooter className="pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Label className="grid gap-2 text-xs font-normal text-muted-foreground">
      <span>{label}</span>
      {children}
    </Label>
  );
}

function readLinkEditFormValues(formData: FormData): LinkEditFormResult {
  const title = requiredFormValue(formData, "title");
  if (!title.ok) return title;

  const description = requiredFormValue(formData, "description");
  if (!description.ok) return description;

  const reason = requiredFormValue(formData, "reason");
  if (!reason.ok) return reason;

  const tags = requiredFormValue(formData, "tags");
  if (!tags.ok) return tags;

  const status = requiredFormValue(formData, "status");
  if (!status.ok) return status;

  return {
    ok: true,
    values: {
      description: description.value.length > 0 ? description.value : null,
      reason: reason.value,
      status: status.value,
      tags: splitTags(tags.value),
      title: title.value,
    },
  };
}

function requiredFormValue(formData: FormData, name: string): RequiredFormValueResult {
  const value = formData.get(name);
  if (typeof value === "string") return { ok: true, value: value.trim() };
  return { ok: false, message: `Missing ${name}.` };
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}
