import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_id, file_name, mime_type } = await req.json();
    if (!file_id) return Response.json({ error: 'file_id required' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

    // Download file content from Google Drive
    const dlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file_id}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!dlRes.ok) {
      const err = await dlRes.text();
      return Response.json({ error: `Drive download error: ${err}` }, { status: dlRes.status });
    }

    const blob = await dlRes.blob();
    const file = new File([blob], file_name, { type: mime_type });

    // Upload to Base44 storage
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

    return Response.json({ file_url, file_name, mime_type });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});