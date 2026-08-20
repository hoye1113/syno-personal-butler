const IMAGE_MIMES = Object.freeze(["image/png", "image/jpeg", "image/gif", "image/webp"]);

function isImageMime(mime) {
  return IMAGE_MIMES.includes(String(mime || "").toLowerCase());
}

export { IMAGE_MIMES, isImageMime };
