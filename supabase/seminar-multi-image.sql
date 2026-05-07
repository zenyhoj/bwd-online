alter table public.seminar_items
add column if not exists media_urls text[];

update public.seminar_items
set media_urls = array[media_url]
where media_type = 'image'
  and media_url is not null
  and (media_urls is null or cardinality(media_urls) = 0);
