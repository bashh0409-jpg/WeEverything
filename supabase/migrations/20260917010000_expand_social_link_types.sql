alter table public.links drop constraint if exists links_type_check;

alter table public.links add constraint links_type_check check (
  type in (
    'portfolio',
    'github',
    'linkedin',
    'instagram',
    'dribbble',
    'behance',
    'awwwards',
    'discord',
    'facebook',
    'youtube',
    'tiktok',
    'x',
    'threads',
    'email',
    'other'
  )
);
