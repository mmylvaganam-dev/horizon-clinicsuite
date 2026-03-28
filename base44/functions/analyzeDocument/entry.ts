import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import OpenAI from 'npm:openai@4.77.0';

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { file_url, analysis_type, custom_prompt } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'File URL required' }, { status: 400 });
    }

    let prompt = '';
    
    switch (analysis_type) {
      case 'lab_report':
        prompt = `Analyze this lab report and extract: test names, values, reference ranges, units, and any critical findings. Format as structured data.`;
        break;
      case 'prescription':
        prompt = `Analyze this prescription and extract: medication name, dosage, frequency, duration, patient name, and prescriber name.`;
        break;
      case 'medical_record':
        prompt = `Analyze this medical record and extract: diagnosis, treatment plan, medications, vital signs, and any notes.`;
        break;
      case 'imaging':
        prompt = `Analyze this imaging report and extract: study type, findings, impressions, and any abnormalities detected.`;
        break;
      case 'custom':
        prompt = custom_prompt || 'Analyze this document and provide key information.';
        break;
      default:
        prompt = 'Analyze this document and provide a summary.';
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: file_url } }
        ]
      }]
    });

    return Response.json({ 
      analysis: response.choices[0].message.content,
      tokens_used: response.usage?.total_tokens || 0
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});