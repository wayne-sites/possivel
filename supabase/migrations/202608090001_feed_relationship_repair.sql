-- Possível — reparo de relacionamentos do feed.
-- Seguro para projetos que vieram de schemas antigos onde CREATE TABLE IF NOT EXISTS
-- não recriou constraints de chave estrangeira necessárias ao PostgREST.

-- O site e o app usam estes relacionamentos para carregar autor, curtidas e comentários.
-- NOT VALID evita bloquear a migração caso exista algum registro legado órfão;
-- novos registros continuam sendo validados normalmente.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'posts_author_id_fkey'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts
      add constraint posts_author_id_fkey
      foreign key (author_id) references public.profiles(id)
      on delete cascade not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'post_likes_post_id_fkey'
      and conrelid = 'public.post_likes'::regclass
  ) then
    alter table public.post_likes
      add constraint post_likes_post_id_fkey
      foreign key (post_id) references public.posts(id)
      on delete cascade not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'post_likes_user_id_fkey'
      and conrelid = 'public.post_likes'::regclass
  ) then
    alter table public.post_likes
      add constraint post_likes_user_id_fkey
      foreign key (user_id) references public.profiles(id)
      on delete cascade not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'comments_post_id_fkey'
      and conrelid = 'public.comments'::regclass
  ) then
    alter table public.comments
      add constraint comments_post_id_fkey
      foreign key (post_id) references public.posts(id)
      on delete cascade not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'comments_author_id_fkey'
      and conrelid = 'public.comments'::regclass
  ) then
    alter table public.comments
      add constraint comments_author_id_fkey
      foreign key (author_id) references public.profiles(id)
      on delete cascade not valid;
  end if;
end $$;

-- Garante privilégios básicos de leitura para o feed; RLS continua controlando quais linhas podem ser vistas.
grant select on table public.profiles, public.posts, public.post_likes, public.comments to anon, authenticated;

-- Pede ao PostgREST para atualizar o cache de schema/relacionamentos imediatamente.
notify pgrst, 'reload schema';
