import fs from "fs";
import path from "path";

export const tool = {
  name: "fileManager",
  description: "Read or write files in the project directory.",

  async run({ action, path: filePath, content }) {
    if (!action || !filePath) return { error: "action and path required" };
    const fullPath = path.resolve(filePath);

    try {
      if (action === "read") {
        const data = fs.readFileSync(fullPath, "utf-8");
        return { content: data };
      } else if (action === "write") {
        fs.writeFileSync(fullPath, content ?? "", "utf-8");
        return { ok: true };
      }
      return { error: "Invalid action" };
    } catch (err) {
      return { error: err.message };
    }
  },
};

export default tool;
