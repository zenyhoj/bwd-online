"use client";

import { useActionState, useEffect, useState } from "react";

import { createSeminarItemAction, deleteSeminarItemAction, updateSeminarItemAction } from "@/actions/seminar";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SeminarItem } from "@/types";

type SeminarItemFormProps = {
  items: SeminarItem[];
};

function DeleteSeminarButton({ seminarItemId }: { seminarItemId: string }) {
  const [state, formAction, pending] = useActionState(deleteSeminarItemAction, initialActionState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="seminarItemId" value={seminarItemId} />
      <Button type="submit" variant="outline" loading={pending}>
        Delete
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

function SeminarItemRow({ item }: { item: SeminarItem }) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState(updateSeminarItemAction, initialActionState);
  const [mediaType, setMediaType] = useState<string>(item.media_type);

  useEffect(() => {
    if (state.success) {
      setIsEditing(false);
    }
  }, [state.success]);

  if (isEditing) {
    return (
      <div className="rounded-xl border border-border/80 bg-muted/5 p-4">
        <form action={formAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={item.id} />
          {item.media_url ? <input type="hidden" name="existingMediaUrl" value={item.media_url} /> : null}

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`title-${item.id}`}>Title</Label>
            <Input id={`title-${item.id}`} name="title" defaultValue={item.title} required />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`description-${item.id}`}>Description</Label>
            <textarea
              id={`description-${item.id}`}
              name="description"
              className="min-h-36 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={item.description}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`mediaType-${item.id}`}>Media type</Label>
            <select
              id={`mediaType-${item.id}`}
              name="mediaType"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value)}
            >
              <option value="text">Text only</option>
              <option value="image">Image Upload</option>
              <option value="pdf">PDF Upload</option>
              <option value="video">Video (YouTube/Drive URL)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`displayOrder-${item.id}`}>Display order</Label>
            <Input
              id={`displayOrder-${item.id}`}
              name="displayOrder"
              type="number"
              min={0}
              defaultValue={item.display_order}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`isActive-${item.id}`}>Status</Label>
            <select
              id={`isActive-${item.id}`}
              name="isActive"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={item.is_active.toString()}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <div className="space-y-2">
            {mediaType === "video" ? (
              <>
                <Label htmlFor={`mediaUrl-${item.id}`}>Media URL (Video)</Label>
                <Input
                  id={`mediaUrl-${item.id}`}
                  name="mediaUrl"
                  type="url"
                  defaultValue={item.media_type === "video" ? item.media_url || "" : ""}
                  placeholder="e.g. YouTube embed URL"
                />
              </>
            ) : null}

            {mediaType === "image" || mediaType === "pdf" ? (
              <>
                <Label htmlFor={`mediaFile-${item.id}`}>Upload New File (Optional)</Label>
                <Input
                  id={`mediaFile-${item.id}`}
                  name="mediaFile"
                  type="file"
                  accept={mediaType === "pdf" ? "application/pdf" : "image/*"}
                />
                {item.media_url && (mediaType === "image" || mediaType === "pdf") ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave blank to keep current file: <a href={item.media_url} target="_blank" rel="noreferrer" className="underline">{item.media_url.split("/").pop()}</a>
                  </p>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="md:col-span-2">
            <FormMessage state={state} />
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <Button type="submit" loading={pending}>
              Save changes
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/80 p-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <span>Order {item.display_order}</span>
          <span>{item.media_type}</span>
          <span>{item.is_active ? "Active" : "Inactive"}</span>
        </div>
        <h3 className="text-lg font-semibold">{item.title}</h3>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{item.description}</p>
        {item.media_url ? (
          <p className="text-xs text-muted-foreground">
            Media URL:{" "}
            <a href={item.media_url} target="_blank" rel="noreferrer" className="underline break-all">
              {item.media_url}
            </a>
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setIsEditing(true)}>
          Edit
        </Button>
        <DeleteSeminarButton seminarItemId={item.id} />
      </div>
    </div>
  );
}

export function SeminarItemForm({ items }: SeminarItemFormProps) {
  const [state, formAction, pending] = useActionState(createSeminarItemAction, initialActionState);
  const [mediaType, setMediaType] = useState<string>("text");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add seminar item</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                className="min-h-36 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mediaType">Media type</Label>
              <select
                id="mediaType"
                name="mediaType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value)}
              >
                <option value="text">Text only</option>
                <option value="image">Image Upload</option>
                <option value="pdf">PDF Upload</option>
                <option value="video">Video (YouTube/Drive URL)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayOrder">Display order</Label>
              <Input id="displayOrder" name="displayOrder" type="number" min={0} defaultValue={items.length} required />
            </div>
            
            {mediaType === "video" ? (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="mediaUrl">Media URL (Video)</Label>
                <Input
                  id="mediaUrl"
                  name="mediaUrl"
                  type="url"
                  placeholder="e.g. YouTube embed URL or Google Drive link"
                />
              </div>
            ) : null}

            {mediaType === "image" || mediaType === "pdf" ? (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="mediaFile">Upload File</Label>
                <Input
                  id="mediaFile"
                  name="mediaFile"
                  type="file"
                  accept={mediaType === "pdf" ? "application/pdf" : "image/*"}
                />
              </div>
            ) : null}

            <div className="md:col-span-2">
              <FormMessage state={state} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" loading={pending}>
                Add seminar item
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current seminar list</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No seminar items published yet.</p>
          ) : (
            items.map((item) => (
              <SeminarItemRow key={item.id} item={item} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
