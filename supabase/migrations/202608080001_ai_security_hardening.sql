-- Possível — IA + hardening de segurança.
-- Para projetos que já executaram supabase-schema.sql, execute este arquivo UMA vez no SQL Editor.

-- 1) Corrige o trigger de totais de causas sem referenciar OLD em INSERT.
create or replace function public.update_cause_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.cause_id is not null and new.status = 'paid' then
      update public.causes
      set raised_amount = raised_amount + new.amount,
          support_count = support_count + 1
      where id = new.cause_id;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.cause_id is not null and new.status = 'paid' and old.status is distinct from 'paid' then
      update public.causes
      set raised_amount = raised_amount + new.amount,
          support_count = support_count + 1
      where id = new.cause_id;
    elsif old.cause_id is not null and old.status = 'paid' and new.status in ('refunded','failed') then
      update public.causes
      set raised_amount = greatest(0, raised_amount - old.amount),
          support_count = greatest(0, support_count - 1)
      where id = old.cause_id;
    end if;
    return new;
  end if;

  return new;
end;
$$;

-- 2) Limites da Possível IA.
insert into public.plan_entitlements(plan, feature_key, enabled, numeric_limit) values
  ('free', 'ai_requests_daily', true, 5),
  ('pro',  'ai_requests_daily', true, 100)
on conflict(plan, feature_key)
do update set enabled = excluded.enabled, numeric_limit = excluded.numeric_limit, updated_at = now();

-- 3) Bloqueios passam a impedir interação real entre as duas contas.
create or replace function public.is_blocked_pair(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_user_a is null or p_user_b is null or p_user_a = p_user_b then false
    else exists (
      select 1
      from public.user_blocks b
      where (b.blocker_id = p_user_a and b.blocked_id = p_user_b)
         or (b.blocker_id = p_user_b and b.blocked_id = p_user_a)
    )
  end;
$$;

create or replace function public.can_interact_with_post(p_post_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.posts p
    where p.id = p_post_id
      and not public.is_blocked_pair(auth.uid(), p.author_id)
  );
$$;

grant execute on function public.is_blocked_pair(uuid, uuid) to anon, authenticated;
grant execute on function public.can_interact_with_post(bigint) to authenticated;

create index if not exists user_blocks_reverse_idx on public.user_blocks(blocked_id, blocker_id);

drop policy if exists "posts_select" on public.posts;
create policy "posts_select" on public.posts for select
using (auth.uid() is null or not public.is_blocked_pair(auth.uid(), author_id));

drop policy if exists "likes_select" on public.post_likes;
drop policy if exists "likes_insert_own" on public.post_likes;
create policy "likes_select" on public.post_likes for select
using (auth.uid() is null or not public.is_blocked_pair(auth.uid(), user_id));
create policy "likes_insert_own" on public.post_likes for insert
with check (auth.uid() = user_id and public.can_interact_with_post(post_id));

drop policy if exists "comments_select" on public.comments;
drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_select" on public.comments for select
using (
  auth.uid() is null
  or (
    not public.is_blocked_pair(auth.uid(), author_id)
    and public.can_interact_with_post(post_id)
  )
);
create policy "comments_insert_own" on public.comments for insert
with check (auth.uid() = author_id and public.can_interact_with_post(post_id));

drop policy if exists "follows_select" on public.follows;
drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_select" on public.follows for select
using (
  auth.uid() is null
  or (
    not public.is_blocked_pair(auth.uid(), follower_id)
    and not public.is_blocked_pair(auth.uid(), following_id)
  )
);
create policy "follows_insert_own" on public.follows for insert
with check (
  auth.uid() = follower_id
  and not public.is_blocked_pair(follower_id, following_id)
);

drop policy if exists "messages_select_participants" on public.messages;
drop policy if exists "messages_insert_sender" on public.messages;
drop policy if exists "messages_update_receiver" on public.messages;
drop policy if exists "messages_delete_sender" on public.messages;
create policy "messages_select_participants" on public.messages for select
using (
  auth.uid() in (sender_id, receiver_id)
  and not public.is_blocked_pair(sender_id, receiver_id)
);
create policy "messages_insert_sender" on public.messages for insert
with check (
  auth.uid() = sender_id
  and not public.is_blocked_pair(sender_id, receiver_id)
);
create policy "messages_update_receiver" on public.messages for update
using (
  auth.uid() = receiver_id
  and not public.is_blocked_pair(sender_id, receiver_id)
)
with check (
  auth.uid() = receiver_id
  and not public.is_blocked_pair(sender_id, receiver_id)
);
create policy "messages_delete_sender" on public.messages for delete
using (auth.uid() = sender_id);

drop policy if exists "listings_select" on public.listings;
create policy "listings_select" on public.listings for select
using (
  (status = 'active' or auth.uid() = seller_id)
  and (auth.uid() is null or not public.is_blocked_pair(auth.uid(), seller_id))
);

drop policy if exists "causes_select" on public.causes;
create policy "causes_select" on public.causes for select
using (
  (status = 'active' or auth.uid() = creator_id)
  and (auth.uid() is null or not public.is_blocked_pair(auth.uid(), creator_id))
);

-- Ao bloquear, remove conexões existentes nos dois sentidos.
create or replace function public.cleanup_relationships_after_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and following_id = new.blocked_id)
     or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return new;
end;
$$;

drop trigger if exists user_block_cleanup on public.user_blocks;
create trigger user_block_cleanup
after insert on public.user_blocks
for each row execute function public.cleanup_relationships_after_block();

-- 4) Pagamentos: o cliente não pode criar compra com preço adulterado.
alter table public.payments drop constraint if exists payments_amount_reasonable;
alter table public.payments
  add constraint payments_amount_reasonable check (amount >= 1 and amount <= 100000) not valid;

drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own" on public.payments for insert
with check (
  auth.uid() = payer_id
  and status = 'pending'
  and provider = 'mercadopago'
  and amount between 1 and 100000
  and (
    (
      kind = 'purchase'
      and listing_id is not null
      and cause_id is null
      and exists (
        select 1
        from public.listings l
        where l.id = listing_id
          and l.status = 'active'
          and l.listing_type = 'venda'
          and l.seller_id <> auth.uid()
          and l.price = amount
      )
    )
    or
    (
      kind = 'donation'
      and cause_id is not null
      and listing_id is null
      and exists (
        select 1
        from public.causes c
        where c.id = cause_id
          and c.status = 'active'
      )
    )
  )
);

-- 5) Rate limiting no banco para reduzir spam/bots mesmo se o frontend for ignorado.
create or replace function public.enforce_insert_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_actor_column text := tg_argv[0];
  v_max_actions integer := tg_argv[1]::integer;
  v_window_seconds integer := tg_argv[2]::integer;
  v_count bigint;
begin
  v_actor := nullif(to_jsonb(new) ->> v_actor_column, '')::uuid;
  if v_actor is null then
    return new;
  end if;

  execute format(
    'select count(*) from public.%I where %I = $1 and created_at > now() - ($2 * interval ''1 second'')',
    tg_table_name,
    v_actor_column
  )
  into v_count
  using v_actor, v_window_seconds;

  if v_count >= v_max_actions then
    raise exception 'Muitas ações em pouco tempo. Aguarde e tente novamente.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists posts_rate_limit on public.posts;
create trigger posts_rate_limit before insert on public.posts
for each row execute function public.enforce_insert_rate_limit('author_id','12','300');

drop trigger if exists comments_rate_limit on public.comments;
create trigger comments_rate_limit before insert on public.comments
for each row execute function public.enforce_insert_rate_limit('author_id','30','300');

drop trigger if exists messages_rate_limit on public.messages;
create trigger messages_rate_limit before insert on public.messages
for each row execute function public.enforce_insert_rate_limit('sender_id','120','300');

drop trigger if exists listings_rate_limit on public.listings;
create trigger listings_rate_limit before insert on public.listings
for each row execute function public.enforce_insert_rate_limit('seller_id','10','3600');

drop trigger if exists causes_rate_limit on public.causes;
create trigger causes_rate_limit before insert on public.causes
for each row execute function public.enforce_insert_rate_limit('creator_id','5','3600');

drop trigger if exists follows_rate_limit on public.follows;
create trigger follows_rate_limit before insert on public.follows
for each row execute function public.enforce_insert_rate_limit('follower_id','60','300');

drop trigger if exists likes_rate_limit on public.post_likes;
create trigger likes_rate_limit before insert on public.post_likes
for each row execute function public.enforce_insert_rate_limit('user_id','240','300');

drop trigger if exists reports_rate_limit on public.reports;
create trigger reports_rate_limit before insert on public.reports
for each row execute function public.enforce_insert_rate_limit('reporter_id','15','3600');

drop trigger if exists payments_rate_limit on public.payments;
create trigger payments_rate_limit before insert on public.payments
for each row execute function public.enforce_insert_rate_limit('payer_id','30','3600');

drop trigger if exists calls_rate_limit on public.call_sessions;
create trigger calls_rate_limit before insert on public.call_sessions
for each row execute function public.enforce_insert_rate_limit('host_id','20','3600');

-- 6) Consumo atômico da cota diária da IA.
create or replace function public.consume_daily_feature(p_feature_key text)
returns table(allowed boolean, remaining integer, effective_plan text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_plan text;
  v_enabled boolean;
  v_limit numeric;
  v_period text := to_char((now() at time zone 'UTC')::date, 'YYYY-MM-DD');
  v_usage numeric;
begin
  if v_user is null then
    raise exception 'Não autenticado';
  end if;

  v_plan := public.get_effective_plan(v_user);

  select pe.enabled, pe.numeric_limit
  into v_enabled, v_limit
  from public.plan_entitlements pe
  where pe.plan = v_plan and pe.feature_key = p_feature_key;

  if coalesce(v_enabled, false) = false then
    return query select false, 0, v_plan;
    return;
  end if;

  if v_limit is null then
    return query select true, 2147483647, v_plan;
    return;
  end if;

  insert into public.usage_counters(user_id, feature_key, period, usage, updated_at)
  values(v_user, p_feature_key, v_period, 1, now())
  on conflict(user_id, feature_key, period)
  do update
    set usage = public.usage_counters.usage + 1,
        updated_at = now()
    where public.usage_counters.usage < v_limit
  returning usage into v_usage;

  if v_usage is null then
    select usage into v_usage
    from public.usage_counters
    where user_id = v_user and feature_key = p_feature_key and period = v_period;

    return query select false, 0, v_plan;
    return;
  end if;

  return query
  select true, greatest(0, floor(v_limit - v_usage)::integer), v_plan;
end;
$$;

revoke all on function public.consume_daily_feature(text) from public;
grant execute on function public.consume_daily_feature(text) to authenticated;

-- 7) Tabelas de auditoria e webhooks continuam sem acesso direto do cliente.
revoke all on public.payment_webhook_events from anon, authenticated;
revoke all on public.feature_audit_logs from anon, authenticated;
