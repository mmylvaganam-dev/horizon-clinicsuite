import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

/**
 * Drop-in replacement for base44.integrations.Core.InvokeLLM that routes
 * through the app's own OpenAI API key (OPENAI_API_KEY secret) instead of
 * platform LLM credits.
 *
 * Accepts: { prompt, response_json_schema?, file_urls?, model? }
 * Returns: parsed JSON object when response_json_schema is provided,
 *          otherwise { result: "text" }.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { prompt, response_json_schema, file_urls, model } = body;

    if (!prompt) return Response.json({ error: 'prompt is required' }, { status: 400 });

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return Response.json({ error: 'OPENAI_API_KEY secret not set' }, { status: 500 });

    const useVision = Array.isArray(file_urls) && file_urls.length > 0;
    const chatModel = model || (useVision ? 'gpt-4o' : 'gpt-4o-mini');

    // Append JSON schema instruction so the model returns valid JSON
    let fullPrompt = prompt;
    if (response_json_schema) {
      fullPrompt += '\n\nReturn ONLY a valid JSON object matching this structure (no markdown fences, no explanation, no surrounding text):\n' + JSON.stringify(response_json_schema);
    }

    let messages;
    if (useVision) {
      const content = [{ type: 'text', text: fullPrompt }];
      for (const url of file_urls) {
        content.push({ type: 'image_url', image_url: { url } });
      }
      messages = [{ role: 'user', content }];
    } else {
      messages = [{ role: 'user', content: fullPrompt }];
    }

    const payload = {
      model: chatModel,
      messages,
      ...(response_json_schema ? { response_format: { type: 'json_object' } } : {})
    };

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return Response.json({ error: `OpenAI API error (${aiRes.status}): ${errText}` }, { status: 502 });
    }

    const aiData = await aiRes.json();
    const text = aiData.choices?.[0]?.message?.content || '';

    if (response_json_schema) {
      const parsed = JSON.parse(text);
      return Response.json(parsed);
    }
    return Response.json({ result: text });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});