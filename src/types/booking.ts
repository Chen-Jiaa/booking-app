export interface BookingDay {
    booking_id: number
    created_at: null | string
    date: string
    day_type: 'main_event' | 'rehearsal_setup'
    end_time: null | string
    event_id: null | string
    id: string
    is_all_day: boolean | null
    start_time: null | string
  }

export interface Bookings {
    booking_type: null | string
    client_name: null | string
    created_at: string
    email: string
    end_time: string
    event_id: string
    event_name: null | string
    expected_attendance: null | number
    id: string
    is_multi_day: boolean | null
    name: string
    phone: string
    purpose: string
    room_id: string
    room_name: string
    start_time: string
    status: string
    user_id: string
  }
