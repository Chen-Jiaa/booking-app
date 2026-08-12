begin;

-- Preserve room IDs so existing bookings and unavailable periods continue to
-- point at the same physical spaces after their display names change.
update public.rooms
set name = case name
  when 'Class Room 1' then 'Holding Room 1'
  when 'Class Room 2' then 'Holding Room 2'
  when 'VIP Room' then 'VIP Room 3'
  when 'Artist Room' then 'VIP Room 4'
  when 'Main Hall' then 'Auditorium'
  else name
end
where name in ('Class Room 1', 'Class Room 2', 'VIP Room', 'Artist Room', 'Main Hall');

-- Earlier fuzzy calendar matching incorrectly imported Office Common Area as
-- Office Pantry. It is not a bookable website room, so remove only those
-- generated holds and hide their external booking rows from the calendars.
with ignored_external_events as (
  select event_id
  from public.bookings
  where booking_type = 'external'
    and event_id is not null
    and purpose ~* '^OFFICE COMMON AREA[[:space:]]+BOOKED([[:space:]]|$)'
)
update public.bookings
set status = 'cancelled'
where event_id in (select event_id from ignored_external_events);

delete from public.unavailable_periods
where reason like 'gcal:%'
  and split_part(reason, ':', 2) in (
    select event_id
    from public.bookings
    where booking_type = 'external'
      and event_id is not null
      and purpose ~* '^OFFICE COMMON AREA[[:space:]]+BOOKED([[:space:]]|$)'
  );

-- Booking rows retain a denormalised room name for calendar and history views.
-- Update both single-room and comma-separated room lists without changing IDs.
update public.bookings
set room_name = regexp_replace(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(room_name, '(^|, )Class Room 1(?=, |$)', '\1Holding Room 1', 'g'),
          '(^|, )Class Room 2(?=, |$)', '\1Holding Room 2', 'g'
        ),
        '(^|, )Lobby to Main Hall(?=, |$)', '\1Lobby', 'g'
      ),
      '(^|, )Artist Room(?=, |$)', '\1VIP Room 4', 'g'
    ),
    '(^|, )VIP Room(?=, |$)', '\1VIP Room 3', 'g'
  ),
  '(^|, )Main Hall(?=, |$)', '\1Auditorium', 'g'
);

commit;
