import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios"; 

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// --- Gemini Kurulumu ---
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY bulunamadı. .env dosyasını kontrol et!");
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// --- MCP-Server Adresi ---
const MCP_SERVER_URL = "http://localhost:5050/mcp/run";

app.get("/", (req, res) => res.send("Gemini API backend çalışıyor!"));

// --- YENİ ORKESTRATÖR YOLU ---
app.post("/api/convert-figma", async (req, res) => {
  try {
    const { fileKey } = req.body;
    if (!fileKey) {
      return res.status(400).json({ error: "fileKey gereklidir." });
    }

    // ADIM 1: MCP-Server'dan ham HTML'i al
    console.log(`[Backend] MCP-Server'a istek atılıyor (fileKey: ${fileKey})`);
    const mcpResponse = await axios.post(MCP_SERVER_URL, {
      tool: "convertFigmaToHTML",
      args: { fileKey: fileKey },
    });

    const rawHtml = mcpResponse.data.result?.html;
    if (!rawHtml) {
      return res.status(500).json({
        error: "MCP-Server'dan ham HTML alınamadı.",
        details: mcpResponse.data,
      });
    }
    console.log(`[Backend] Ham HTML alındı (Uzunluk: ${rawHtml.length})`);

    // ADIM 2: Gemini için prompt hazırla (TÜM SYNTAX Hataları Düzeltildi)
    const prompt = `
      Aşağıda bir Figma tasarımından dönüştürülmüş, 'position: absolute' kullanan ham bir HTML kodu var.
      Görevin:
      1. Bu koddaki elemanların GÖRSEL DÜZENİNİ KORUYARAK 'position: absolute' stilini kaldırmayı dene.
      2. Elemanların içeriğini (metin, resim linki vb.) KESİNLİKLE DEĞİŞTİRME.
      3. Olmayan bir yapı (header, footer, sidebar gibi) SIFIRDAN UYDURMA. Sadece mevcut elemanları (\`div\`, \`p\`, \`img\`) yeniden düzenle.
      4. CSS kodunu <style> etiketi içine al ve HTML'in <head> kısmına ekle.
      5. Yalnızca ve yalnızca güncellenmiş HTML kodunu yanıt olarak döndür. 
         Ekstra açıklama veya "İşte kodunuz:" gibi giriş cümleleri kullanma.
         Markdown (\`\`\`html) etiketlerini kullanma. Sadece kodun kendisini döndür.

      İşlenecek Ham HTML Kod:
      ${rawHtml}
    `;

    // ADIM 3: Gemini'a gönder
    console.log("[Backend] Gemini'a iyileştirme için gönderiliyor...");
    const result = await geminiModel.generateContent(prompt);
    const reply = result.response.text();

    // ADIM 4: İyileştirilmiş kodu Frontend'e Geri Gönder
    res.json({ optimizedHtml: reply });

  } catch (error) {
    console.error("Dönüştürme hatası:", error.response?.data || error.message);
    res.status(500).json({
      error: "Ana dönüştürme hatası.",
      details: error.response?.data || error.message,
    });
  }
});


// --- Mevcut Gemini Chat Yolu (Değişiklik yok) ---
app.post("/api/ask", async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log("Frontend'den gelen prompt:", prompt ?? "");
    const result = await geminiModel.generateContent(prompt ?? "");
    const reply = result.response.text();
    res.json({ reply });
  } catch (error) {
    console.error("Gemini hata:", error);
    res.status(500).json({
      reply: "Sunucu hatası — Gemini yanıt vermedi.",
      error: error.message || String(error),
    });
  }
});

app.listen(port, () =>
  console.log(`🚀 Gemini Orkestratör Server http://localhost:${port} adresinde çalışıyor`)
);