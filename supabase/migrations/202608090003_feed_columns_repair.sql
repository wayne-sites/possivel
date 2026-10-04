-- Possível — reparo de colunas legadas usadas pelo feed.
-- Seguro para bancos antigos onde CREATE TABLE IF NOT EXISTS não adicionou colunas novas.

alter table public.posts
  add column if not exists kind text not null default 'Post',
  add column if not exists media_url text,
  add column if not exists media_type text,
  add column if not exists updated_at timestamptz not null default now();

-- Normaliza valores legados vazios/nulos caso a coluna kind já existisse sem default.
update public.posts
set kind = 'Post'
where kind is null or btrim(kind) = '';

alter table public.posts alter column kind set default 'Post';

-- O frontend atual usa estes campos explicitamente ao montar o feed.
grant select on table public.posts to anon, authenticated;

-- Recarrega o cache de schema do PostgREST para reconhecer imediatamente as colunas.
notify pgrst, 'reload schema';
