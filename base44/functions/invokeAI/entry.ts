import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { prompt, response_json_schema, file_url } = await req.json();

    const messages = [];

    if (file_url) {
      // Use vision model for file/image inputs
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: file_url } }
        ]
      });
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    const requestParams = {
      model: 'gpt-4o-mini',
      messages,
    };

    // Use structured JSON output if schema provided
    if (response_json_schema) {
      requestParams.response_format = { type: 'json_object' };
      requestParams.messages[0] = {
        ...requestParams.messages[0],
        content: (file_url
          ? [{ type: 'text', text: `Respond ONLY with valid JSON matching this schema: ${JSON.stringify(response_json_schema)}\n\n${prompt}` }, { type: 'image_url', image_url: { url: file_url } }]
          : `Respond ONLY with valid JSON matching this schema: ${JSON.stringify(response_json_schema)}\n\n${prompt}`)
      };
    }

    const completion = await openai.chat.completions.create(requestParams);
    const content = completion.choices[0].message.content;

    const result = response_json_schema ? JSON.parse(content) : content;
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});