<script setup>
import { ref } from "vue";

const message = ref("");
const response = ref("");
const tools = ref([]);
const MCP_BASE = "http://localhost:5050/mcp";

async function loadTools() {
  const res = await fetch(`${MCP_BASE}/tools`);
  const data = await res.json();
  tools.value = data.tools || [];
}

async function runTool(toolName, args = {}) {
  const res = await fetch(`${MCP_BASE}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool: toolName, args }),
  });
  const data = await res.json();
  response.value = JSON.stringify(data, null, 2);
}

loadTools();
</script>

<template>
  <div class="p-6">
    <h1 class="text-xl font-bold mb-4">MCP Tools Test</h1>
    <div class="flex gap-2 mb-4">
      <input
        v-model="message"
        placeholder="Enter tool name (e.g. figmaToHTML)"
        class="border p-2 rounded flex-1"
      />
      <button
        @click="runTool(message)"
        class="bg-green-500 text-white px-4 py-2 rounded"
      >
        Run
      </button>
    </div>
    <p class="text-gray-600 mb-2">Available tools:</p>
    <ul class="text-blue-600 mb-4">
      <li v-for="t in tools" :key="t.name">{{ t.name }}</li>
    </ul>
    <pre class="bg-gray-100 p-4 rounded">{{ response }}</pre>
  </div>
</template>
