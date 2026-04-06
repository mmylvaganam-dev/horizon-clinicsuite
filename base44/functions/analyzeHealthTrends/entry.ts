import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { patientId, patientName, vitalsData, labData } = await req.json();

  // Build a structured summary of the patient's trends
  const trendSummary = [];

  // HbA1c trend
  if (labData?.hba1c?.length >= 2) {
    const sorted = [...labData.hba1c].sort((a, b) => new Date(a.date) - new Date(b.date));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const change = (last.value - first.value).toFixed(1);
    trendSummary.push(`HbA1c: ${sorted.map(d => `${d.date}: ${d.value}%`).join(', ')} — change: ${change >= 0 ? '+' : ''}${change}% over ${sorted.length} readings`);
  }

  // Blood pressure trend
  if (vitalsData?.bp?.length >= 2) {
    const sorted = [...vitalsData.bp].sort((a, b) => new Date(a.date) - new Date(b.date));
    trendSummary.push(`Blood Pressure (systolic): ${sorted.map(d => `${d.date}: ${d.sys}/${d.dia} mmHg`).join(', ')}`);
  }

  // LDL/Total cholesterol trend
  if (labData?.lipids?.length >= 1) {
    const sorted = [...labData.lipids].sort((a, b) => new Date(a.date) - new Date(b.date));
    trendSummary.push(`Lipid Profile: ${sorted.map(d => `${d.date}: TC=${d.total_cholesterol ?? '?'}, LDL=${d.ldl ?? '?'}, HDL=${d.hdl ?? '?'}, TG=${d.triglycerides ?? '?'} (all mmol/L)`).join(' | ')}`);
  }

  // Weight trend
  if (vitalsData?.weight?.length >= 2) {
    const sorted = [...vitalsData.weight].sort((a, b) => new Date(a.date) - new Date(b.date));
    const change = (sorted[sorted.length - 1].value - sorted[0].value).toFixed(1);
    trendSummary.push(`Weight: ${sorted.map(d => `${d.date}: ${d.value}kg`).join(', ')} — change: ${change >= 0 ? '+' : ''}${change}kg`);
  }

  if (trendSummary.length === 0) {
    return Response.json({
      alerts: [],
      summary: "Insufficient longitudinal data to perform trend analysis. Please ensure at least 2 readings per metric.",
      analyzed_at: new Date().toISOString(),
    });
  }

  const prompt = `You are a clinical decision support AI. Analyze the following longitudinal health data for patient "${patientName}" and identify:
1. Any concerning trends (worsening chronic conditions)
2. Metrics significantly deviating from target ranges
3. Positive trends that should be reinforced

Target ranges for reference:
- HbA1c: <5.7% normal, 5.7-6.4% prediabetes, ≥6.5% diabetes, target for diabetics: <7%
- Blood Pressure: <120/80 normal, 120-129/<80 elevated, ≥130/80 hypertension
- LDL cholesterol: <2.6 mmol/L optimal, <3.4 acceptable, ≥4.1 high risk
- HDL cholesterol: >1.0 mmol/L acceptable, >1.6 optimal
- Triglycerides: <1.7 mmol/L normal, 1.7-5.6 borderline-high
- Total cholesterol: <5.2 mmol/L desirable

PATIENT DATA:
${trendSummary.join('\n')}

Respond in JSON with this exact structure:
{
  "summary": "2-3 sentence overall clinical summary",
  "alerts": [
    {
      "severity": "critical|warning|info",
      "metric": "metric name",
      "message": "clear clinical message for the physician",
      "recommendation": "specific action recommended",
      "trend_direction": "improving|worsening|stable"
    }
  ],
  "positive_findings": ["list of positive trends if any"]
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content);

  return Response.json({
    ...result,
    analyzed_at: new Date().toISOString(),
  });
});