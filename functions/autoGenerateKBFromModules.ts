import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all modules
    const modules = await base44.entities.Module.list();
    
    // Fetch existing KB articles to avoid duplicates
    const existingArticles = await base44.entities.KnowledgeBaseArticle.list();
    const existingTitles = new Set(existingArticles.map(a => a.title?.toLowerCase()));

    const created = [];

    for (const module of modules) {
      // Create KB article from module if not already exists
      const articleTitle = `${module.module_name} Module Guide`;
      const articleKey = articleTitle.toLowerCase();

      if (!existingTitles.has(articleKey)) {
        const article = await base44.entities.KnowledgeBaseArticle.create({
          title: articleTitle,
          content: `# ${module.module_name}\n\n**Module Code:** ${module.module_code}\n\n**Category:** ${module.category}\n\n**Status:** ${module.status}\n\n**Version:** ${module.version}\n\n## Description\n${module.description || 'No description available.'}\n\n## Getting Started\nThis module provides functionality for ${module.description || 'various operations'}. Please refer to the admin panel for detailed configuration options.\n\n## Support\nFor issues or questions about this module, please submit a support ticket.`,
          category: module.category || 'other',
          tags: [module.module_code, 'module', 'auto-generated'],
          status: 'published'
        });
        created.push(article);
      }
    }

    return Response.json({ 
      count: created.length,
      articles: created.map(a => ({ id: a.id, title: a.title }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});