"use client";

import Image from "next/image";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { createStory, updateStory, createStoryVideoUploadUrl, getStoryImages, deleteStoryImage } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/client";
import type { StoryRow } from "@/lib/supabase/types";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,image/avif";

type GalleryImage = { id: string; path: string; width: number | null; height: number | null };

export default function StoryForm({
  editing,
  onDone,
}: {
  editing: StoryRow | null;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [galleryPending, startGalleryTransition] = useTransition();

  useEffect(() => {
    if (!editing) {
      setGallery([]);
      return;
    }
    getStoryImages(editing.id).then((result) => setGallery(result.images));
  }, [editing]);

  function handleDeleteImage(img: GalleryImage) {
    if (!editing) return;
    if (!confirm("Remove this photo from the story?")) return;
    startGalleryTransition(async () => {
      const result = await deleteStoryImage(img.id, editing.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setGallery((prev) => prev.filter((g) => g.id !== img.id));
    });
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setUploadStatus(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      // Video goes straight to Storage from the browser — the same reason
      // as the Services form's direct upload — before the video's own
      // bytes ever exist. Photos stay on the existing synchronous path.
      const video = formData.get("video");
      if (video instanceof File && video.size > 0) {
        setUploadStatus("Uploading video…");
        const uploadUrl = await createStoryVideoUploadUrl(video.type);
        if (uploadUrl.error || !uploadUrl.path || !uploadUrl.token) {
          setError(uploadUrl.error ?? "Couldn't prepare the video for upload.");
          setUploadStatus(null);
          return;
        }
        const browserSupabase = createClient();
        const { error: putError } = await browserSupabase.storage
          .from("story-videos")
          .uploadToSignedUrl(uploadUrl.path, uploadUrl.token, video);
        if (putError) {
          setError(`Couldn't upload the video: ${putError.message}`);
          setUploadStatus(null);
          return;
        }
        formData.set("video_path", uploadUrl.path);
        formData.set("video_size", String(video.size));
      }
      formData.delete("video");
      setUploadStatus(null);

      const result = editing
        ? await updateStory(editing.id, editing.slug, formData)
        : await createStory(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <form
      onSubmit={submit}
      className="form-card"
      style={{ marginBottom: 24 }}
      key={editing?.id ?? "new"}
    >
      <h3 style={{ fontSize: 18, marginBottom: 4 }}>{editing ? "Edit story" : "New story"}</h3>

      <label className="f" htmlFor="st-title">
        Title
      </label>
      <input id="st-title" name="title" required defaultValue={editing?.title} />

      <label className="f" htmlFor="st-date">
        Date
      </label>
      <input id="st-date" name="date" type="date" required defaultValue={editing?.date} />

      <label className="f" htmlFor="st-excerpt">
        Excerpt <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(card summary, one or two sentences)</span>
      </label>
      <input id="st-excerpt" name="excerpt" required defaultValue={editing?.excerpt} />

      <label className="f" htmlFor="st-body">
        Description
      </label>
      <textarea
        id="st-body"
        name="body"
        rows={6}
        required
        defaultValue={editing?.body}
        placeholder="Separate paragraphs with a blank line."
      />

      <label className="f" htmlFor="st-images">
        Photos {editing && gallery.length > 0 && <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(new files are added to the gallery below — the first photo overall is the cover)</span>}
      </label>
      {editing && gallery.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {gallery.map((img, i) => (
            <div key={img.id} style={{ position: "relative" }}>
              <Image
                src={img.path}
                alt=""
                width={90}
                height={Math.round((90 * (img.height ?? 1)) / (img.width ?? 1)) || 90}
                style={{ borderRadius: 6, display: "block", objectFit: "cover" }}
                unoptimized
              />
              {i === 0 && (
                <span style={{ position: "absolute", top: 2, left: 2, fontSize: 10, background: "var(--navy)", color: "#fff", padding: "1px 5px", borderRadius: 4 }}>
                  Cover
                </span>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ position: "absolute", bottom: -2, right: -2, padding: "1px 6px", fontSize: 11, background: "#fff" }}
                onClick={() => handleDeleteImage(img)}
                disabled={galleryPending}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <input id="st-images" name="images" type="file" accept={IMAGE_ACCEPT} multiple />

      <label className="f" htmlFor="st-video">
        Video {editing?.video_path && <span style={{ fontWeight: 400, color: "var(--ink-soft)" }}>(choose a file to replace the current one)</span>}
      </label>
      {editing?.video_path && (
        <div style={{ marginBottom: 8 }}>
          <video
            width={200}
            height={112}
            style={{ borderRadius: 8, display: "block", background: "#000" }}
            controls
          >
            <source src={editing.video_path} />
          </video>
        </div>
      )}
      <input id="st-video" name="video" type="file" accept="video/mp4,video/webm,video/quicktime" />

      <label className="consent">
        <input type="checkbox" name="published" defaultChecked={editing?.published ?? true} />
        Published — visible on the public Events and Stories pages
      </label>

      {error && (
        <div className="notice warn" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button className="btn btn-primary" disabled={pending}>
          {uploadStatus ?? (pending ? "Saving…" : editing ? "Save changes" : "Add story")}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone} disabled={pending}>
          Cancel
        </button>
      </div>
    </form>
  );
}
