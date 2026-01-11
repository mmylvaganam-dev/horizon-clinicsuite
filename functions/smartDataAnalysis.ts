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

    const { analysis_type, data, question } = await req.json();

    if (!data) {
      return Response.json({ error: 'data is required' }, { status: 400 });
    }

    let systemPrompt = "You are an intelligent healthcare data analyst with expertise in medical informatics, clinical trends, and operational analytics.";
    let userPrompt = "";

    if (question) {
      // Custom question about the data
      userPrompt = `${question}\n\nData:\n${JSON.stringify(data, null, 2)}`;
    } else if (analysis_type === 'patient_trends') {
      userPrompt = `Analyze patient visit and health trends from this data:\n\n${JSON.stringify(data, null, 2)}\n\nIdentify patterns, risks, and provide preventive care recommendations.`;
    } else if (analysis_type === 'medication_patterns') {
      userPrompt = `Analyze medication prescription patterns:\n\n${JSON.stringify(data, null, 2)}\n\nIdentify most prescribed drugs, potential issues, and optimization opportunities.`;
    } else if (analysis_type === 'revenue_insights') {
      userPrompt = `Provide smart insights on revenue data:\n\n${JSON.stringify(data, null, 2)}\n\nIdentify growth opportunities, revenue leakage, and actionable strategies.`;
    } else if (analysis_type === 'appointment_optimization') {
      userPrompt = `Analyze appointment scheduling data:\n\n${JSON.stringify(data, null, 2)}\n\nIdentify no-show patterns, optimal scheduling times, and efficiency improvements.`;
    } else if (analysis_type === 'inventory_prediction') {
      userPrompt = `Analyze inventory usage patterns:\n\n${JSON.stringify(data, null, 2)}\n\nPredict future needs, identify slow-moving items, and suggest reorder quantities.`;
    } else if (analysis_type === 'clinical_decision_support') {
      userPrompt = `Provide clinical decision support based on:\n\n${JSON.stringify(data, null, 2)}\n\nSuggest differential diagnoses, recommended tests, and treatment options. DISCLAIMER: For informational purposes only, not a substitute for professional judgment.`;
    } else {
      userPrompt = `Analyze this healthcare data and provide actionable insights:\n\n${JSON.stringify(data, null, 2)}`;
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
      temperature: 0.5,
      max_tokens: 2000,
    });

    const insights = response.choices[0].message.content;

    return Response.json({
      success: true,
      insights,
      analysis_type,
      analyzed_at: new Date().toISOString(),
      tokens_used: response.usage.total_tokens
    });

  } catch (error) {
    console.error('Smart analysis error:', error);
    return Response.json({ 
      error: error.message,
      details: 'Failed to perform smart analysis'
    }, { status: 500 });
  }
});