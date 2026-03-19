import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
      file_urls: [file_url]
    });

    return Response.json({ 
      analysis: result,
      tokens_used: 0
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});