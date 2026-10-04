-- Possível — canonicaliza os relacionamentos usados pelo feed.
-- Execute UMA vez se o feed continuar falhando após 202608090001_feed_relationship_repair.sql.
--
-- Motivo: bancos antigos podem já ter FKs com nomes diferentes. A migration anterior
-- podia acabar deixando mais de um relacionamento entre as mesmas tabelas, e o
-- PostgREST passa a considerar o embed posts -> profiles ambíguo.

create or replace function pg_temp.drop_matching_fk(
  p_table regclass,
  p_column text,
  p_referenced_table regclass
)
returns void
language plpgsql
as $$
declare
  r record;
  v_attnum smallint;
begin
  select a.attnum::smallint
    into v_attnum
  from pg_attribute a
  where a.attrelid = p_table
    and a.attname = p_column
    and not a.attisdropped;

  if v_attnum is null then
    raise exception 'Coluna %.% não encontrada', p_table::text, p_column;
  end if;

  for r in
    select c.conname
    from pg_constraint c
    where c.contype = 'f'
      and c.conrelid = p_table
      and c.confrelid = p_referenced_table
      and c.conkey = array[v_attnum]::smallint[]
  loop
    execute format('alter table %s drop constraint %I', p_table, r.conname);
  end loop;
end;
$$;

-- posts.author_id -> profiles.id
select pg_temp.drop_matching_fk('public.posts'::regclass, 'author_id', 'public.profiles'::regclass);
alter table public.posts
  add constraint posts_author_id_fkey
  foreign key (author_id) references public.profiles(id)
  on delete cascade not valid;

-- comments.author_id -> profiles.id
select pg_temp.drop_matching_fk('public.comments'::regclass, 'author_id', 'public.profiles'::regclass);
alter table public.comments
  add constraint comments_author_id_fkey
  foreign key (author_id) references public.profiles(id)
  on delete cascade not valid;

-- comments.post_id -> posts.id
select pg_temp.drop_matching_fk('public.comments'::regclass, 'post_id', 'public.posts'::regclass);
alter table public.comments
  add constraint comments_post_id_fkey
  foreign key (post_id) references public.posts(id)
  on delete cascade not valid;

-- post_likes.user_id -> profiles.id
select pg_temp.drop_matching_fk('public.post_likes'::regclass, 'user_id', 'public.profiles'::regclass);
alter table public.post_likes
  add constraint post_likes_user_id_fkey
  foreign key (user_id) references public.profiles(id)
  on delete cascade not valid;

-- post_likes.post_id -> posts.id
select pg_temp.drop_matching_fk('public.post_likes'::regclass, 'post_id', 'public.posts'::regclass);
alter table public.post_likes
  add constraint post_likes_post_id_fkey
  foreign key (post_id) references public.posts(id)
  on delete cascade not valid;

grant select on table public.profiles, public.posts, public.post_likes, public.comments to anon, authenticated;

-- Recarrega imediatamente os relacionamentos no PostgREST.
notify pgrst, 'reload schema';
