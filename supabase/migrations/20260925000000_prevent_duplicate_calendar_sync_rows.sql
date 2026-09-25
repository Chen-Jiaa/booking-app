begin;

-- Keep one canonical row before enforcing the keys used by concurrent syncs.
delete from public.bookings duplicate
using public.bookings canonical
where duplicate.booking_type = 'external'
  and canonical.booking_type = 'external'
  and duplicate.event_id is not null
  and duplicate.event_id = canonical.event_id
  and duplicate.id > canonical.id;

delete from public.unavailable_periods duplicate
using public.unavailable_periods canonical
where duplicate.room_id = canonical.room_id
  and duplicate.reason = canonical.reason
  and duplicate.id > canonical.id;

create unique index bookings_external_event_id_key
  on public.bookings (event_id)
  where booking_type = 'external' and event_id is not null;

alter table public.unavailable_periods
  add constraint unavailable_periods_room_reason_key unique (room_id, reason);

commit;
