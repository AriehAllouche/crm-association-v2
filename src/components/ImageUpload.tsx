import { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadImage, generateUniqueFileName, isValidImageFile, processImage } from '../lib/imageUpload';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageUploaded: (url: string) => void;
  onImageRemoved?: () => void;
  bucket?: string;
  pathPrefix?: string;
  disabled?: boolean;
}

export function ImageUpload({
  currentImageUrl,
  onImageUploaded,
  onImageRemoved,
  bucket = 'animals',
  pathPrefix = '',
  disabled = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation
    if (!isValidImageFile(file)) {
      setError('Ce fichier n\'est pas une image valide (JPEG, PNG, GIF, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB max
      setError('L\'image ne doit pas dépasser 5MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const processedFile = await processImage(file);
      const fileName = generateUniqueFileName(file.name, pathPrefix);
      const path = pathPrefix ? `${pathPrefix}/${fileName}` : fileName;
      
      const publicUrl = await uploadImage(processedFile, bucket, path);
      setPreviewUrl(publicUrl);
      onImageUploaded(publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onImageRemoved?.();
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {previewUrl ? (
        <div className="relative group">
          <img
            src={previewUrl}
            alt="Aperçu"
            className="h-32 w-32 rounded-lg object-cover border border-neutral-200"
          />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-error-500 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-error-600"
              disabled={uploading}
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || uploading}
          className="flex h-32 w-32 flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 transition-colors hover:border-primary-400 hover:bg-primary-50 disabled:opacity-50 disabled:hover:border-neutral-300 disabled:hover:bg-neutral-50"
        >
          {uploading ? (
            <Loader2 size={24} className="animate-spin text-primary-500" />
          ) : (
            <>
              <Upload size={24} className="text-neutral-400" />
              <span className="mt-2 text-xs text-neutral-500">Ajouter une photo</span>
            </>
          )}
        </button>
      )}

      {error && (
        <p className="text-xs text-error-600">{error}</p>
      )}

      <p className="text-xs text-neutral-400">
        Formats acceptés: JPEG, PNG, GIF, WebP (max 5MB)
      </p>
    </div>
  );
}

interface ImageGalleryProps {
  images: Array<{ id: string; url: string; description?: string }>;
  onImageDelete?: (id: string) => void;
  onImageAdd?: () => void;
  maxImages?: number;
  disabled?: boolean;
}

export function ImageGallery({
  images,
  onImageDelete,
  onImageAdd,
  maxImages = 10,
  disabled = false,
}: ImageGalleryProps) {
  const canAddMore = !disabled && (!maxImages || images.length < maxImages);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {images.map((image) => (
          <div key={image.id} className="relative group">
            <img
              src={image.url}
              alt={image.description || 'Image'}
              className="h-24 w-24 rounded-lg object-cover border border-neutral-200"
            />
            {!disabled && onImageDelete && (
              <button
                type="button"
                onClick={() => onImageDelete(image.id)}
                className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-error-500 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-error-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}

        {canAddMore && onImageAdd && (
          <button
            type="button"
            onClick={onImageAdd}
            className="flex h-24 w-24 flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 transition-colors hover:border-primary-400 hover:bg-primary-50"
          >
            <ImageIcon size={20} className="text-neutral-400" />
            <span className="mt-1 text-xs text-neutral-500">Ajouter</span>
          </button>
        )}
      </div>

      {images.length === 0 && !canAddMore && (
        <p className="text-sm text-neutral-500">Aucune image</p>
      )}
    </div>
  );
}
