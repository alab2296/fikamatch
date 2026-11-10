export interface StoredObject {
  key: string;
  contentType: string;
  size: number;
}

/** Where profile photos live. An EU object store implements this later. */
export interface PhotoStorage {
  put(key: string, data: Buffer, contentType: string): Promise<StoredObject>;
  get(key: string): Promise<{ data: Buffer; contentType: string } | null>;
  /** Removes the object for real. Deleting a missing key is not an error. */
  delete(key: string): Promise<void>;
  /** Short-lived link for showing a photo to a signed-in user. */
  signedUrl(key: string, ttlSeconds: number): string;
  /** True only for a link made by signedUrl that has not expired or been altered. */
  verifyUrl(key: string, expires: number, signature: string): boolean;
}
