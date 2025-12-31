/**
 * Compute SHA-256 hash of a file using streaming for efficiency with large files.
 */
export async function computeFileHash(filePath: string): Promise<string> {
  const file = Bun.file(filePath);
  const hasher = new Bun.CryptoHasher("sha256");
  const stream = file.stream();
  for await (const chunk of stream) {
    hasher.update(chunk);
  }
  return hasher.digest("hex");
}
