const fs = require("fs");
const path = require("path");

module.exports = async (musicDirectory, storedPath) => {
  if (typeof storedPath !== "string" || storedPath.trim() === "") {
    const error = new Error("Song file path is missing.");
    error.code = "ENOENT";
    throw error;
  }

  const candidates = [storedPath];
  if (path.extname(storedPath).toLowerCase() === ".mp3") {
    candidates.push(`${storedPath}.m4a`);
    candidates.push(`${storedPath.slice(0, -4)}.m4a`);
  }

  for (const candidate of candidates) {
    const audioPath = path.resolve(musicDirectory, candidate);
    const relativePath = path.relative(musicDirectory, audioPath);
    if (
      relativePath === ".." ||
      relativePath.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relativePath)
    ) {
      const error = new Error("Invalid song file path.");
      error.code = "EINVAL";
      throw error;
    }

    try {
      const stats = await fs.promises.stat(audioPath);
      if (stats.isFile()) return { audioPath, size: stats.size };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  const error = new Error(`Song file not found: ${storedPath}`);
  error.code = "ENOENT";
  throw error;
};
