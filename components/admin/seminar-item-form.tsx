"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";

import { createSeminarItemAction, deleteSeminarItemAction, updateSeminarItemAction, reorderSeminarItemsAction } from "@/actions/seminar";
import { initialActionState } from "@/actions/state";
import { FormMessage } from "@/components/forms/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { AccreditedPlumbersTable } from "@/components/applicant/accredited-plumbers-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { getSeminarImageUrls } from "@/lib/seminar-media";
import type { SeminarItem } from "@/types";

type SeminarItemFormProps = {
  items: SeminarItem[];
};

type SortableImageCardProps = {
  index: number;
  onDelete: (url: string) => void;
  pending: boolean;
  title: string;
  url: string;
};

function SortableImageCard({ index, onDelete, pending, title, url }: SortableImageCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: url
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden rounded-lg border border-border/80 bg-background ${isDragging ? "opacity-70 ring-2 ring-primary" : ""}`}
    >
      <img
        src={url}
        alt={`${title} image ${index + 1}`}
        className="h-32 w-full object-cover"
      />
      <div className="flex items-center justify-between gap-2 p-2">
        <div
          className="flex cursor-grab items-center gap-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder image ${index + 1}`}
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
          <span className="text-xs">Image {index + 1}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(url)}
          disabled={pending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function DeleteSeminarButton({ seminarItemId }: { seminarItemId: string }) {
  const [state, formAction, pending] = useActionState(deleteSeminarItemAction, initialActionState);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="seminarItemId" value={seminarItemId} />
      <Button type="submit" variant="outline" size="icon" className="text-destructive hover:bg-destructive/10" loading={pending}>
        <Trash2 className="h-4 w-4" />
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

function SeminarItemRow({ item }: { item: SeminarItem }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [state, formAction, pending] = useActionState(updateSeminarItemAction, initialActionState);
  const [mediaType, setMediaType] = useState<string>(item.media_type);
  const [description, setDescription] = useState<string>(item.description);
  const imageUrls = getSeminarImageUrls(item);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(imageUrls);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: isEditing // Prevent dragging while editing
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1
  };
  const imageSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (state.success) {
      setIsEditing(false);
    }
  }, [state.success]);

  useEffect(() => {
    setDescription(item.description);
    setMediaType(item.media_type);
    setExistingImageUrls(imageUrls);
  }, [item.description, item.media_type, item.media_url, item.media_urls]);

  const handleImageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setExistingImageUrls((current) => {
      const oldIndex = current.findIndex((url) => url === active.id);
      const newIndex = current.findIndex((url) => url === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return current;
      }

      return arrayMove(current, oldIndex, newIndex);
    });
  };

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className="rounded-xl border border-border/80 bg-muted/5 p-4">
        <form action={formAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="id" value={item.id} />
          {item.media_url ? <input type="hidden" name="existingMediaUrl" value={item.media_url} /> : null}
          <input type="hidden" name="existingMediaUrls" value={JSON.stringify(existingImageUrls)} />

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`title-${item.id}`}>Title</Label>
            <Input id={`title-${item.id}`} name="title" defaultValue={item.title} required />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`description-${item.id}`}>Description</Label>
            <input type="hidden" name="description" value={description} />
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Write the seminar description here..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`mediaType-${item.id}`}>Featured media</Label>
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
                {mediaType === "image" ? (
                  <>
                    <Label htmlFor={`mediaFiles-${item.id}`}>Upload New Images (Optional)</Label>
                    <Input
                      id={`mediaFiles-${item.id}`}
                      name="mediaFiles"
                      type="file"
                      accept="image/*"
                      multiple
                    />
                    {existingImageUrls.length > 0 ? (
                      <div className="space-y-1 text-xs text-muted-foreground mt-1">
                        <p>Drag images to reorder them. Remove any image you no longer want, then save changes.</p>
                        {isMounted ? (
                          <DndContext sensors={imageSensors} collisionDetection={closestCenter} onDragEnd={handleImageDragEnd}>
                            <SortableContext items={existingImageUrls} strategy={verticalListSortingStrategy}>
                              <div className="grid gap-3 sm:grid-cols-2">
                                {existingImageUrls.map((url, index) => (
                                  <SortableImageCard
                                    key={url}
                                    index={index}
                                    onDelete={(imageUrl) => setExistingImageUrls((current) => current.filter((entry) => entry !== imageUrl))}
                                    pending={pending}
                                    title={item.title}
                                    url={url}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {existingImageUrls.map((url, index) => (
                              <div key={url} className="overflow-hidden rounded-lg border border-border/80 bg-background">
                                <img
                                  src={url}
                                  alt={`${item.title} image ${index + 1}`}
                                  className="h-32 w-full object-cover"
                                />
                                <div className="flex items-center justify-between gap-2 p-2">
                                  <span className="text-xs text-muted-foreground">Image {index + 1}</span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setExistingImageUrls((current) => current.filter((entry) => entry !== url))}
                                    disabled={pending}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                    {existingImageUrls.length === 0 ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        No existing images will be kept. Upload new images before saving if you still want a gallery.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Label htmlFor={`mediaFile-${item.id}`}>Upload New File (Optional)</Label>
                    <Input
                      id={`mediaFile-${item.id}`}
                      name="mediaFile"
                      type="file"
                      accept="application/pdf"
                    />
                    {item.media_url ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave blank to keep current file: <a href={item.media_url} target="_blank" rel="noreferrer" className="underline">{item.media_url.split("/").pop()}</a>
                      </p>
                    ) : null}
                  </>
                )}
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDescription(item.description);
                setMediaType(item.media_type);
                setExistingImageUrls(imageUrls);
                setIsEditing(false);
              }}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col gap-4 rounded-xl border border-border/80 p-4 lg:flex-row lg:items-start lg:justify-between bg-card ${
        isDragging ? "opacity-50 ring-2 ring-primary" : ""
      }`}
    >
      <div className="flex gap-4 w-full">
        <div
          className="mt-1 flex cursor-grab flex-col items-center justify-start text-muted-foreground hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          title="Drag to reorder"
        >
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span>Order {item.display_order}</span>
            <span>{item.media_type}</span>
            <span>{item.is_active ? "Active" : "Inactive"}</span>
          </div>
          <h3 className="text-lg font-semibold">{item.title}</h3>
          <RichTextContent 
            value={item.description} 
            className="max-w-3xl" 
            replacements={{
              "{{PLUMBERS_LIST}}": <AccreditedPlumbersTable />
            }}
          />
          {imageUrls.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {imageUrls.length} image{imageUrls.length > 1 ? "s" : ""} attached
            </p>
          ) : null}
          {item.media_url ? (
            <p className="text-xs text-muted-foreground">
              Media URL:{" "}
              <a href={item.media_url} target="_blank" rel="noreferrer" className="underline break-all">
                {item.media_url}
              </a>
            </p>
          ) : null}
        </div>
        </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="icon" onClick={() => setIsEditing(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <DeleteSeminarButton seminarItemId={item.id} />
      </div>
    </div>
  );
}

export function SeminarItemForm({ items: initialItems }: SeminarItemFormProps) {
  const [state, formAction, pending] = useActionState(createSeminarItemAction, initialActionState);
  const [mediaType, setMediaType] = useState<string>("text");
  const [description, setDescription] = useState<string>("");
  const [items, setItems] = useState(initialItems);
  const createFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Keep local items in sync if server props change (e.g. after adding/deleting)
    setItems([...initialItems].sort((a, b) => a.display_order - b.display_order));
  }, [initialItems]);

  useEffect(() => {
    if (state.success) {
      createFormRef.current?.reset();
      setDescription("");
      setMediaType("text");
    }
  }, [state.success]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);

      // Reassign display_order
      const reorderedItems = newItems.map((item, index) => ({
        ...item,
        display_order: index
      }));

      // Update local state first for immediate UI feedback
      setItems(reorderedItems);

      // Fire server action to persist the new order in background
      reorderSeminarItemsAction(reorderedItems.map((i) => ({ id: i.id, displayOrder: i.display_order })));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add seminar item</CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={createFormRef} action={formAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <input type="hidden" name="description" value={description} />
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Write the seminar description here..."
            />
          </div>
            <div className="space-y-2">
              <Label htmlFor="mediaType">Featured media</Label>
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
                {mediaType === "image" ? (
                  <>
                    <Label htmlFor="mediaFiles">Upload Images</Label>
                    <Input
                      id="mediaFiles"
                      name="mediaFiles"
                      type="file"
                      accept="image/*"
                      multiple
                    />
                  </>
                ) : (
                  <>
                    <Label htmlFor="mediaFile">Upload File</Label>
                    <Input
                      id="mediaFile"
                      name="mediaFile"
                      type="file"
                      accept="application/pdf"
                    />
                  </>
                )}
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
          <p className="text-sm text-muted-foreground">Drag items by the grip handle to change their order.</p>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No seminar items published yet.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                {items.map((item) => (
                  <SeminarItemRow key={item.id} item={item} />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
