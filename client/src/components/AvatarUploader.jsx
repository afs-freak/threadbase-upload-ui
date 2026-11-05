import { useEffect, useRef, useState } from "react";
import apiClient from "../services/apiClient.js";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function getFileError(file) {
  if (!ALLOWED.includes(file.type)) {
    return "Choose a JPEG, PNG, WebP, or GIF image.";
  }
  if (file.size > MAX_SIZE) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}

export default function AvatarUploader() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function selectFile(selectedFile) {
    if (isUploading) return;

    setError("");
    setUploadedUrl("");
    setProgress(0);

    if (!selectedFile) return;

    const fileError = getFileError(selectedFile);
    if (fileError) {
      setFile(null);
      setError(fileError);
      return;
    }

    setFile(selectedFile);
  }

  function handleFileChange(event) {
    selectFile(event.target.files[0]);
    event.target.value = "";
  }

  function handleDragOver(event) {
    event.preventDefault();
    if (!isUploading) setIsDragging(true);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    if (!isUploading) selectFile(event.dataTransfer.files[0]);
  }

  async function upload() {
    if (!file || isUploading) return;

    const fileError = getFileError(file);
    if (fileError) {
      setError(fileError);
      return;
    }

    setError("");
    setProgress(0);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await apiClient.post("/api/upload", formData, {
        onUploadProgress(event) {
          if (event.total) {
            setProgress(Math.round((event.loaded * 100) / event.total));
          }
        },
      });

      if (typeof response.data?.url !== "string") {
        throw new Error("The server did not return the uploaded file URL.");
      }

      setProgress(100);
      setUploadedUrl(new URL(response.data.url, apiClient.defaults.baseURL).href);
    } catch (uploadError) {
      setError(
        uploadError.response?.data?.error ||
          uploadError.message ||
          "Upload failed. Please try again.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <div
        className={`drop-zone${isDragging ? " dragging" : ""}`}
        onClick={() => {
          if (!isUploading) inputRef.current?.click();
        }}
        onKeyDown={(event) => {
          if (!isUploading && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsDragging(false);
          }
        }}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        aria-label="Choose or drop an avatar image"
      >
        <p>Drag an image here, or click to choose</p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(",")}
          hidden
          disabled={isUploading}
          onClick={(event) => event.stopPropagation()}
          onChange={handleFileChange}
        />
      </div>

      {file && (
        <div>
          <p>{file.name}</p>
          {previewUrl && <img className="preview" src={previewUrl} alt="Avatar preview" />}
        </div>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      <button onClick={upload} disabled={!file || isUploading}>
        {isUploading ? "Uploading..." : "Upload"}
      </button>

      {(isUploading || progress > 0) && (
        <div
          className="bar"
          role="progressbar"
          aria-label="Upload progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className="fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {uploadedUrl && (
        <p>
          Upload complete: <a href={uploadedUrl}>{uploadedUrl}</a>
        </p>
      )}
    </div>
  );
}
