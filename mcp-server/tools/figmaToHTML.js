import fetch from "node-fetch";

export default {
  name: "figmaToHTML",
  description: "Convert Figma file (text + image nodes) into formatted PrimeVue code",

  async run({ fileKey }) {
    const token = process.env.FIGMA_API_KEY;
    if (!fileKey || !token) {
      throw new Error("Missing fileKey or FIGMA_API_KEY in environment.");
    }

    const fileRes = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { "X-Figma-Token": token },
    });
    const fileData = await fileRes.json();

    if (!fileRes.ok) {
      throw new Error(`Figma API error (${fileRes.status}): ${JSON.stringify(fileData)}`);
    }

    const firstPage = fileData.document.children?.[0];
    if (!firstPage) return { html: "No pages found in this Figma file." };

    const nodeIds = firstPage.children.map((n) => n.id).join(",");
    const nodeRes = await fetch(
      `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeIds}`,
      { headers: { "X-Figma-Token": token } }
    );
    const nodeData = await nodeRes.json();

    let htmlParts = [];
    for (const node of Object.values(nodeData.nodes)) {
      if (!node.document) continue;
      const n = node.document;
      if (n.type === "TEXT" && n.characters) {
        htmlParts.push(`<p>${n.characters}</p>`);
      } else if (n.fills?.[0]?.type === "IMAGE") {
        htmlParts.push(`<img src="(image placeholder)" alt="${n.name}" />`);
      } else if (n.type === "RECTANGLE" || n.type === "FRAME") {
        htmlParts.push(`<div class="card">${n.name}</div>`);
      }
    }

    // Formatlı ve okunabilir hale getir
    const formattedHTML = htmlParts.join("\n    ");

    const htmlOutput = `
<template>
  <div class="p-6 bg-gray-50">
    ${formattedHTML}
  </div>
</template>

<script setup>
</script>

<style scoped>
.card {
  border: 1px solid #ddd;
  padding: 10px;
  margin: 10px;
}
</style>
`;

    return { html: htmlOutput };
  },
};
