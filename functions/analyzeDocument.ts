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

    const { file_url, analysis_type, custom_prompt } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Determine the prompt based on analysis type
    let systemPrompt = "You are a medical document analyst. Analyze the provided document and extract relevant information.";
    let userPrompt = custom_prompt || "Analyze this medical document and provide a structured summary of findings, recommendations, and key data points.";

    if (analysis_type === 'lab_report') {
      userPrompt = "Extract all test results, reference ranges, abnormal findings, and provide a clinical summary. Return as structured JSON.";
    } else if (analysis_type === 'prescription') {
      userPrompt = "Extract medication names, dosages, frequencies, and prescriber information. Return as structured JSON.";
    } else if (analysis_type === 'medical_record') {
      userPrompt = "Summarize patient history, diagnoses, treatments, and current status from this medical record.";
    } else if (analysis_type === 'imaging') {
      userPrompt = "Analyze this medical imaging report and extract findings, impressions, and recommendations.";
    }

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
      max_tokens: 2000,
    });

    const analysis = response.choices[0].message.content;

    return Response.json({
      success: true,
      analysis,
      analysis_type,
      tokens_used: response.usage.total_tokens
    });

  } catch (error) {
    console.error('Document analysis error:', error);
    return Response.json({ 
      error: error.message,
      details: 'Failed to analyze document with AI'
    }, { status: 500 });
  }
});