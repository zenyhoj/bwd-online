/**
 * Compresses an image file using the Canvas API.
 * 
 * @param file The original image file
 * @param options Compression options (maxWidth, quality)
 * @returns A promise that resolves to a compressed File object (JPEG)
 */
export async function compressImage(
  file: File, 
  options = { maxWidth: 1920, quality: 0.8 }
): Promise<File> {
  // If it's not an image, return as is
  if (!file.type.startsWith("image/")) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > options.maxWidth) {
          height = (options.maxWidth / width) * height;
          width = options.maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        // Draw image to canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to blob (JPEG format for better compression)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Create a new File from the blob
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error("Canvas to Blob conversion failed"));
            }
          },
          "image/jpeg",
          options.quality
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}
