import { type CreateLinkInput, type LinkStatus, createLinkInputSchema } from "@caulk.lol/api/links";
import { Button } from "@caulk.lol/ui/components/button";
import { Input } from "@caulk.lol/ui/components/input";
import { Label } from "@caulk.lol/ui/components/label";
import { NativeSelect, NativeSelectOption } from "@caulk.lol/ui/components/native-select";
import { Separator } from "@caulk.lol/ui/components/separator";
import { Textarea } from "@caulk.lol/ui/components/textarea";
import { type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

type CreateLinkStatus = Extract<LinkStatus, "draft" | "published">;

export type LinkFormInitialValues = {
  description?: string;
  reason?: string;
  status?: CreateLinkStatus;
  tags?: string;
  title?: string;
  url?: string;
};

export function LinkForm({
  initialValues,
  isPending,
  onCreate,
  pendingLabel = "Adding",
  resetOnSuccess = true,
  submitLabel = "Add link",
}: {
  initialValues?: LinkFormInitialValues;
  isPending: boolean;
  onCreate: (input: CreateLinkInput, onSuccess: () => void) => void;
  pendingLabel?: string;
  resetOnSuccess?: boolean;
  submitLabel?: string;
}) {
  const status = initialValues?.status ?? "published";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const parsed = createLinkInputSchema.safeParse({
      description: optionalFieldValue(formData, "description"),
      reason: fieldValue(formData, "reason"),
      source: "admin",
      status: fieldValue(formData, "status"),
      tags: splitTags(fieldValue(formData, "tags")),
      title: optionalFieldValue(formData, "title"),
      url: fieldValue(formData, "url"),
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues.map((issue) => issue.message).join(" "));
      return;
    }

    onCreate(parsed.data, () => {
      if (resetOnSuccess) form.reset();
    });
  }

  return (
    <form className="grid h-max gap-4" onSubmit={submit}>
      <div>
        <h2 className="text-sm font-medium">Add link</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Metadata is fetched when title or description is empty.
        </p>
      </div>
      <Separator />
      <Field label="URL">
        <Input
          name="url"
          placeholder="https://"
          type="url"
          defaultValue={initialValues?.url}
          inputMode="url"
          autoCapitalize="none"
          autoComplete="url"
          required
        />
      </Field>
      <Field label="Title override">
        <Input
          name="title"
          placeholder="Fetched when empty"
          defaultValue={initialValues?.title}
          maxLength={160}
        />
      </Field>
      <Field label="Description override">
        <Textarea
          name="description"
          placeholder="Fetched when empty"
          defaultValue={initialValues?.description}
          maxLength={280}
        />
      </Field>
      <Field label="Reason">
        <Textarea
          name="reason"
          placeholder="Why this belongs on the list"
          defaultValue={initialValues?.reason}
          maxLength={400}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_9rem] lg:grid-cols-1 xl:grid-cols-[1fr_9rem]">
        <Field label="Tags">
          <Input name="tags" placeholder="tools, writing" defaultValue={initialValues?.tags} />
        </Field>
        <Field label="Status">
          <NativeSelect name="status" defaultValue={status} className="w-full">
            <NativeSelectOption value="published">published</NativeSelectOption>
            <NativeSelectOption value="draft">draft</NativeSelectOption>
          </NativeSelect>
        </Field>
      </div>
      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </form>
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

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function fieldValue(formData: FormData, name: string) {
  const value = formData.get(name);
  if (typeof value !== "string") throw new Error(`Missing ${name}.`);
  return value.trim();
}

function optionalFieldValue(formData: FormData, name: string) {
  const value = fieldValue(formData, name);
  return value.length > 0 ? value : undefined;
}
