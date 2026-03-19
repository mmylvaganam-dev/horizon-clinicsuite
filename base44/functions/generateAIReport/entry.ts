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

    const { report_type, data, patient_id, date_range, include_recommendations } = await req.json();

    if (!report_type || !data) {
      return Response.json({ error: 'report_type and data are required' }, { status: 400 });
    }

    // Build prompt based on report type
    let systemPrompt = "You are a healthcare reporting specialist. Generate comprehensive, professional medical reports.";
    let userPrompt = "";

    if (report_type === 'patient_summary') {
      userPrompt = `Generate a comprehensive patient summary report from this data:\n\n${JSON.stringify(data, null, 2)}\n\nInclude sections for: Demographics, Medical History, Current Medications, Recent Visits, Lab Results, and Clinical Summary.`;
    } else if (report_type === 'financial_analysis') {
      userPrompt = `Analyze this financial data and generate a detailed report:\n\n${JSON.stringify(data, null, 2)}\n\nInclude: Revenue analysis, Expense breakdown, Profit margins, Trends, and Recommendations.`;
    } else if (report_type === 'operational_insights') {
      userPrompt = `Analyze operational metrics and generate insights:\n\n${JSON.stringify(data, null, 2)}\n\nInclude: Key performance indicators, Efficiency metrics, Bottlenecks, and Improvement recommendations.`;
    } else if (report_type === 'dental_treatment_plan') {
      userPrompt = `Create a detailed dental treatment plan from this data:\n\n${JSON.stringify(data, null, 2)}\n\nInclude: Diagnosis, Recommended procedures, Timeline, Cost estimates, and Expected outcomes.`;
    } else if (report_type === 'pharmacy_stock_analysis') {
      userPrompt = `Analyze pharmacy inventory and generate a stock report:\n\n${JSON.stringify(data, null, 2)}\n\nInclude: Stock levels, Expiring items, Reorder recommendations, Usage patterns, and Cost analysis.`;
    } else if (report_type === 'lab_trends') {
      userPrompt = `Analyze lab test trends over time:\n\n${JSON.stringify(data, null, 2)}\n\nIdentify patterns, abnormalities, and provide clinical insights.`;
    } else {
      userPrompt = `Generate a professional report for: ${report_type}\n\nData:\n${JSON.stringify(data, null, 2)}`;
    }

    if (include_recommendations) {
      userPrompt += "\n\nIMPORTANT: Include actionable recommendations and next steps at the end.";
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
          content: userPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const report = response.choices[0].message.content;

    return Response.json({
      success: true,
      report,
      report_type,
      generated_at: new Date().toISOString(),
      tokens_used: response.usage.total_tokens
    });

  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ 
      error: error.message,
      details: 'Failed to generate AI report'
    }, { status: 500 });
  }
});