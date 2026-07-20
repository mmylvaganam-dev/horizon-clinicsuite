import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import * as XLSX from 'npm:xlsx@0.18.5';

/**
 * Drop-in replacement for base44.integrations.Core.ExtractDataFromUploadedFile
 * that routes through the app's own OpenAI API key instead of platform credits.
 *
 * Accepts: { file_url, json_schema }
 * Returns: { status: 'success'|'error', details: string|null, output: any }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url, json_schema } = await req.json();
    if (!file_url || !json_schema) {
      return Response.json({ error: 'file_url and json_schema are required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return Response.json({ status: 'error', details: 'OPENAI_API_KEY secret not set', output: null });

    // Fetch the uploaded file
    const fileRes = await fetch(file_url, {
      headers: { 'User-Agent': 'Horizon-ClinicSuite/1.0 (extractDataOpenAI)' }
    });
    if (!fileRes.ok) {
      return Response.json({ status: 'error', details: `Failed to fetch file: ${fileRes.status}`, output: null });
    }
    const bytes = new Uint8Array(await fileRes.arrayBuffer());
    const lowerUrl = file_url.toLowerCase();
    const contentType = (fileRes.headers.get('content-type') || '').toLowerCase();

    const isImage = /\.(png|jpg|jpeg|gif|webp|bmp)(\?|$)/.test(lowerUrl) || contentType.startsWith('image/');
    const isPdf = /\.pdf(\?|$)/.test(lowerUrl) || contentType.includes('pdf');
    const isXlsx = /\.(xlsx|xls)(\?|$)/.test(lowerUrl) || contentType.includes('spreadsheet') || contentType.includes('excel');

    let promptContent = null;
    let imageDataUrl = null;

    if (isImage) {
      const base64 = bytesToBase64(bytes);
      const ext = (lowerUrl.match(/\.(png|jpg|jpeg|gif|webp|bmp)/) || [, 'png'])[1];
      imageDataUrl = `data:image/${ext};base64,${base64}`;
    } else if (isXlsx) {
      try {
        const workbook = XLSX.read(bytes, { type: 'array' });
        const sheets = workbook.SheetNames.map(name => {
          const sheet = workbook.Sheets[name];
          return { sheetName: name, rows: XLSX.utils.sheet_to_json(sheet, { header: 1 }) };
        });
        promptContent = JSON.stringify(sheets);
      } catch (e) {
        return Response.json({ status: 'error', details: `Excel parsing failed: ${e.message}`, output: null });
      }
    } else if (isPdf) {
      promptContent = await extractPdfText(bytes);
      if (!promptContent.trim()) {
        return Response.json({ status: 'error', details: 'No text could be extracted from PDF (may be a scanned/image-only PDF)', output: null });
      }
    } else {
      // CSV, JSON, HTML, TXT — read as text
      promptContent = new TextDecoder().decode(bytes);
    }

    // OpenAI json_object mode requires the response to be a JSON object.
    // If the schema's top-level type is 'array', wrap it and unwrap the result.
    const isArraySchema = json_schema.type === 'array';
    const apiSchema = isArraySchema
      ? { type: 'object', properties: { items: json_schema } }
      : json_schema;

    const schemaStr = JSON.stringify(apiSchema);
    const instruction = `Extract structured data from the file content below. Return ONLY a valid JSON object matching this schema (no markdown fences, no explanation, no surrounding text):\n${schemaStr}`;

    let messages;
    let model = 'gpt-4o-mini';

    if (imageDataUrl) {
      model = 'gpt-4o';
      messages = [{
        role: 'user',
        content: [
          { type: 'text', text: instruction },
          { type: 'image_url', image_url: { url: imageDataUrl } }
        ]
      }];
    } else {
      messages = [{
        role: 'user',
        content: `${instruction}\n\n--- FILE CONTENT START ---\n${promptContent}\n--- FILE CONTENT END ---`
      }];
    }

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, response_format: { type: 'json_object' } })
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return Response.json({ status: 'error', details: `OpenAI API error (${aiRes.status}): ${errText}`, output: null });
    }

    const aiData = await aiRes.json();
    const text = aiData.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(text);

    // Unwrap array if the schema was array-typed
    const output = isArraySchema ? (parsed.items || []) : parsed;

    return Response.json({ status: 'success', details: null, output });
  } catch (error) {
    return Response.json({ status: 'error', details: error.message, output: null });
  }
});

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

// Basic PDF text extraction: finds FlateDecode-compressed streams, decompresses
// them, and pulls text from Tj / TJ operators. Works for text-based PDFs.
async function extractPdfText(bytes) {
  const latin1 = new TextDecoder('latin1').decode(bytes);
  let fullText = '';
  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
  let match;
  while ((match = streamRegex.exec(latin1)) !== null) {
    const streamData = match[1];
    try {
      const streamBytes = new Uint8Array(streamData.length);
      for (let i = 0; i < streamData.length; i++) streamBytes[i] = streamData.charCodeAt(i) & 0xFF;
      const decompressed = await new Response(
        new Blob([streamBytes]).stream().pipeThrough(new DecompressionStream('deflate'))
      ).text();
      // Tj operator: (text) Tj
      let tjMatch;
      const tjRegex = /\(((?:[^()\\]|\\.)*)\)\s*Tj/g;
      while ((tjMatch = tjRegex.exec(decompressed)) !== null) {
        fullText += tjMatch[1].replace(/\\([nrtbf()\\])/g, '$1') + ' ';
      }
      // TJ array operator: [(text) -num (text)] TJ
      const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
      while ((tjMatch = tjArrayRegex.exec(decompressed)) !== null) {
        const parts = tjMatch[1].match(/\(((?:[^()\\]|\\.)*)\)/g);
        if (parts) {
          fullText += parts.map(p => p.slice(1, -1).replace(/\\([nrtbf()\\])/g, '$1')).join('') + ' ';
        }
      }
    } catch (_) {
      // Not a FlateDecode stream or decompression failed — skip
    }
  }
  return fullText.trim();
}