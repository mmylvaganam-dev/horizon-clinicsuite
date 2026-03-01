import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { call_log_id, transcript } = await req.json();

    if (!call_log_id) return Response.json({ error: 'call_log_id required' }, { status: 400 });

    // Fetch the call log
    const logs = await base44.entities.CallLog.filter({ id: call_log_id });
    const log = logs[0];
    if (!log) return Response.json({ error: 'Call log not found' }, { status: 404 });

    const callTranscript = transcript || log.transcript || '';
    const hasTranscript = callTranscript.trim().length > 0;

    const callContext = `
Call Direction: ${log.direction}
From: ${log.from_number}
To: ${log.to_number}
Extension: ${log.extension || 'N/A'}
Duration: ${log.duration_seconds ? Math.floor(log.duration_seconds / 60) + 'm ' + (log.duration_seconds % 60) + 's' : 'N/A'}
Disposition: ${log.disposition}
Date/Time: ${log.started_at ? new Date(log.started_at).toLocaleString() : 'N/A'}
${hasTranscript ? `\nTranscript:\n${callTranscript}` : '\n[No transcript available — summarize based on call metadata only]'}
    `.trim();

    const prompt = `You are an AI assistant for a healthcare clinic telephony system. Analyze the following call record and provide:
1. A concise 1-2 sentence summary of the call
2. Up to 4 key topics discussed (or inferred from metadata)
3. Up to 3 actionable follow-up suggestions for clinic staff
4. Overall sentiment: positive, neutral, or negative

${hasTranscript ? 'Use the transcript for accurate analysis.' : 'Since no transcript is available, base your analysis on the call metadata (direction, duration, disposition) and suggest likely actions for a healthcare clinic context.'}

Call Record:
${callContext}

Respond with a JSON object with this exact structure:
{
  "summary": "concise call summary",
  "topics": ["topic1", "topic2"],
  "follow_ups": ["action1", "action2"],
  "sentiment": "positive|neutral|negative"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content);

    // Save AI results back to the call log
    const updateData = {
      ai_summary: result.summary || '',
      ai_topics: Array.isArray(result.topics) ? result.topics : [],
      ai_follow_ups: Array.isArray(result.follow_ups) ? result.follow_ups : [],
      ai_sentiment: ['positive', 'neutral', 'negative'].includes(result.sentiment) ? result.sentiment : 'neutral',
      ai_generated_at: new Date().toISOString(),
    };

    if (transcript) {
      updateData.transcript = transcript;
    }

    await base44.entities.CallLog.update(call_log_id, updateData);

    return Response.json({ success: true, ...updateData });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});