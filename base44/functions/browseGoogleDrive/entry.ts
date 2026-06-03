import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { query, folder_id, page_token } = await req.json();

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

    // Build query: search by name or browse a folder
    let q = "trashed = false and (mimeType contains 'image/' or mimeType = 'application/pdf' or mimeType = 'application/vnd.google-apps.folder')";
    if (folder_id) {
      q = `'${folder_id}' in parents and trashed = false`;
    } else if (query) {
      q = `name contains '${query.replace(/'/g, "\\'")}' and trashed = false and (mimeType contains 'image/' or mimeType = 'application/pdf')`;
    }

    const params = new URLSearchParams({
      q,
      fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime,thumbnailLink,webViewLink,parents)',
      orderBy: 'modifiedTime desc',
      pageSize: '30',
    });
    if (page_token) params.set('pageToken', page_token);

    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `Drive API error: ${err}` }, { status: res.status });
    }

    const data = await res.json();
    return Response.json({ files: data.files || [], next_page_token: data.nextPageToken || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});