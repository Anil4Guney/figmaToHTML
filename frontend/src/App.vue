<template>
  <div class="app-container p-6">
    <h1 class="text-2xl font-bold mb-4">Figma To AI-HTML Converter</h1>

    <div class="chat-box flex gap-2 mt-4">
      <InputText
        v-model="userInput"
        placeholder="Enter Figma File Key"
        class="input"
        @keyup.enter="convertFigma"
      />
      <Button
        label="Convert Figma → AI HTML"
        icon="pi pi-sparkles"
        severity="success"
        @click="convertFigma"
        :loading="isLoading" 
      />
    </div>

    <div v-if="isLoading" class="mt-6 p-4 bg-blue-100 border border-blue-300 rounded text-blue-700">
      <p><strong>İşlem Başladı...</strong></p>
      <p>Figma verisi çekiliyor ve Gemini AI tarafından iyileştiriliyor. Bu işlem 30 saniye kadar sürebilir, lütfen bekleyin.</p>
    </div>
    <div v-if="error" class="mt-6 p-4 bg-red-100 border border-red-300 rounded text-red-700">
      <p><strong>Hata Oluştu:</strong> {{ error }}</p>
    </div>


    <div v-if="response && !isLoading" class="mt-6">
      <h2 class="text-xl font-semibold mb-2">Generated AI-Optimized HTML:</h2>
      <pre
        class="bg-gray-100 p-4 rounded text-sm border border-gray-300 overflow-x-auto"
      >
{{ response }}
      </pre>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";

const userInput = ref("");
const response = ref("");
const isLoading = ref(false); // 1. Yüklenme durumu eklendi
const error = ref(null); // 2. Hata durumu eklendi

async function convertFigma() {
  if (!userInput.value.trim() || isLoading.value) {
    return;
  }

  // İşlem başlıyor, arayüzü temizle
  isLoading.value = true;
  error.value = null;
  response.value = "";

  try {
    // 3. YENİ URL: mcp-server (5050) yerine backend (5000) sunucusuna istek at
    const res = await fetch("http://localhost:5000/api/convert-figma", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileKey: userInput.value.trim(), // Sadece fileKey'i gönder
      }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Bilinmeyen bir sunucu hatası oluştu.");
    }

    const data = await res.json();
    
    // 4. Gelen yanıt "optimizedHtml" olacak
    if (data.optimizedHtml) {
      response.value = data.optimizedHtml;
    } else {
      throw new Error("Sunucudan beklenen optimizedHtml verisi gelmedi.");
    }

  } catch (err) {
    console.error("Figma conversion error:", err);
    error.value = err.message; // Hatayı ekrana bas
    response.value = ""; // Başarısız olursa yanıtı temizle
  } finally {
    isLoading.value = false; // 5. İşlem bitince yüklenmeyi durdur
  }
}
</script>

<style scoped>
.app-container {
  max-width: 900px;
  margin: 0 auto;
}
.input {
  width: 420px;
}
pre {
  font-family: "Fira Code", monospace;
  background: #f7f7f7;
  border-radius: 8px;
  padding: 12px;
  white-space: pre-wrap;
  color: #111;
}
</style>