type SeminarMediaRecord = {
  media_type: string;
  media_url: string | null;
  media_urls?: string[] | null;
};

export function getSeminarImageUrls(item: SeminarMediaRecord) {
  if (item.media_type !== "image") {
    return [];
  }

  const urls = item.media_urls?.filter((url): url is string => Boolean(url)) ?? [];

  if (urls.length > 0) {
    return urls;
  }

  return item.media_url ? [item.media_url] : [];
}
