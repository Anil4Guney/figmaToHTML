import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios"; 
import prettier from "prettier"; 

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY bulunamadı. .env dosyasını kontrol et!");
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const MCP_SERVER_URL = "http://localhost:5050/mcp/run";

app.get("/", (req, res) => res.send("Gemini API backend çalışıyor!"));

app.post("/api/convert-figma", async (req, res) => {
  try {
    const { fileKey, nodeId } = req.body; 
    if (!fileKey) {
      return res.status(400).json({ error: "fileKey gereklidir." });
    }

    console.log(`MCP-Server'a istek atılıyor (fileKey: ${fileKey}, nodeId: ${nodeId || 'yok'})`);
    
    const mcpResponse = await axios.post(MCP_SERVER_URL, {
      tool: "convertFigmaToHTML",
      args: { fileKey: fileKey, nodeId: nodeId }, 
    });

    const rawHtmlBody = mcpResponse.data.result?.html;
    const rawCss = mcpResponse.data.result?.css;

    if (!rawHtmlBody || !rawCss) {
      return res.status(500).json({
        error: "MCP-Server'dan ham HTML veya CSS alınamadı.",
        details: mcpResponse.data,
      });
    }
    console.log(` Ham HTML (body) ve CSS alındı (CSS Uzunluk: ${rawCss.length})`);

    const prompt = `
      Görevin: Aşağıdaki HTML body içeriğini alıp,
      bunları tam ve geçerli bir HTML5 belgesinde birleştirmek.

      TALİMATLAR:
      1.  Geçerli bir HTML5 yapısı (<!DOCTYPE html>, <html>, <head>, <body>) oluştur.
      2.  <head> içine <meta charset="UTF-8">, 
          <meta name="viewport" content="width=device-width, initial-scale=1.0"> ve 
          <title>Figma Tasarımı</title> ekle.
      3.  <head> içine CSS'in ekleneceği yere <!--CSS_PLACEHOLDER--> şeklinde bir HTML yorumu ekle.
      4.  Verilen 'HTML Body İçeriği'ni <body> etiketinin içine kopyala.
      5.  HTML içeriğini ASLA değiştirme, semantik hale getirmeye ÇALIŞMA.
      6.  Yanıt olarak SADECE ve SADECE tam HTML kodunu döndür.
          Ekstra açıklama veya markdown (\`\`\`html) kullanma.

      Verilen HTML Body İçeriği:
      ${rawHtmlBody}
    `;

    console.log(" Gemini'a HTML iskeleti için gönderiliyor...");
    const result = await geminiModel.generateContent(prompt);
    const reply = result.response.text();
    let htmlShell = reply.replace(/^```html\n?/i, "").replace(/```$/i, "");

    // Gemini'dan gelen iskelete tam (kesilmemiş) CSS'i enjekte et
    const finalHtml = htmlShell.replace(
      "<!--CSS_PLACEHOLDER-->",
      `<style>\n${rawCss}\n</style>`
    );

    const formattedReply = await prettier.format(finalHtml, {
      parser: "html",
      printWidth: 100,
    });

    res.json({ optimizedHtml: formattedReply }); 

  } catch (error) {
    console.error("Dönüştürme hatası:", error.response?.data || error.message);
    res.status(500).json({
      error: "Ana dönüştürme hatası.",
      details: error.response?.data?.message || error.message, 
    });
  }
});


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
  console.log(` Gemini Orkestratör Server http://localhost:${port} adresinde çalışıyor`)
);