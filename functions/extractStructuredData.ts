import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai@4.77.0';

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, extraction_schema } = await req.json();

    if (!file_url || !extraction_schema) {
      return Response.json({ error: 'file_url and extraction_schema are required' }, { status: 400 });
    }

    const systemPrompt = "You are a medical data extraction specialist. Extract structured data from documents according to the provided schema. Return valid JSON only.";
    
    const userPrompt = `Extract data from this document according to this schema:\n\n${JSON.stringify(extraction_schema, null, 2)}\n\nReturn ONLY valid JSON matching the schema. Do not include any markdown formatting or explanation.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: file_url } }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const extractedData = JSON.parse(response.choices[0].message.content);

    return Response.json({
      success: true,
      data: extractedData,
      tokens_used: response.usage.total_tokens
    });

  } catch (error) {
    console.error('Data extraction error:', error);
    return Response.json({ 
      error: error.message,
      details: 'Failed to extract structured data'
    }, { status: 500 });
  }
});