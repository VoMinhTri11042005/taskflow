/** Return a browser-safe external URL, or null for unsupported schemes. */
export function getSafeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Convert recognised Google Workspace share links into iframe URLs.
 * The frame remains subject to Google's sharing, sign-in and embedding rules.
 * Unknown hosts and paths are deliberately not embedded.
 */
export function getGoogleEmbedUrl(value: string): string | null {
  const safeUrl = getSafeExternalUrl(value);
  if (!safeUrl) return null;

  const url = new URL(safeUrl);
  if (url.protocol !== 'https:' || url.port) return null;

  if (url.hostname === 'drive.google.com') {
    if (/^\/open\/?$/.test(url.pathname)) {
      const ids = url.searchParams.getAll('id');
      if (ids.length !== 1 || !/^[\w-]+$/.test(ids[0])) return null;
      url.pathname = `/file/d/${ids[0]}/preview`;
      url.searchParams.delete('id');
      return url.href;
    }

    const file = url.pathname.match(/^\/file\/(?:u\/\d+\/)?d\/([\w-]+)(?:\/(?:view|preview|edit))?\/?$/);
    if (!file) return null;
    url.pathname = `/file/d/${file[1]}/preview`;
    return url.href;
  }

  if (url.hostname !== 'docs.google.com') return null;

  // Published documents use /d/e/<published-id>/pub, not the editable ID.
  const published = url.pathname.match(/^\/(document|spreadsheets|presentation)\/(?:u\/\d+\/)?d\/e\/([\w-]+)\/(?:pub|pubhtml|embed)\/?$/);
  if (published) {
    const [, type, id] = published;
    url.pathname = `/${type}/d/e/${id}/${type === 'presentation' ? 'embed' : type === 'spreadsheets' ? 'pubhtml' : 'pub'}`;
    url.searchParams.set('embedded', 'true');
    return url.href;
  }

  const editor = url.pathname.match(/^\/(document|spreadsheets|presentation)\/(?:u\/\d+\/)?d\/([\w-]+)(?:\/(?:edit|view|preview|copy|embed|mobilebasic))?\/?$/);
  if (editor) {
    url.pathname = `/${editor[1]}/d/${editor[2]}/preview`;
    return url.href;
  }

  const form = url.pathname.match(/^\/forms\/(?:u\/\d+\/)?d\/(e\/)?([\w-]+)(?:\/(?:edit|viewform|preview|mobilebasic))?\/?$/);
  if (form) {
    url.pathname = `/forms/d/${form[1] || ''}${form[2]}/viewform`;
    url.searchParams.set('embedded', 'true');
    return url.href;
  }

  return null;
}
