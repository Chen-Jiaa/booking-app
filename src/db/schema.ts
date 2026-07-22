import { InferSelectModel } from "drizzle-orm";
import {
  bigserial,
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const authUsers = pgTable("auth.users", {
  id: uuid("id").primaryKey(),
});

export const bookings = pgTable("bookings", {
  bookingType: text("booking_type").default("standard"),
  clientName: text("client_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  email: text("email").notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  eventId: text("event_id"),
  eventName: text("event_name"),
  expectedAttendance: integer("expected_attendance"),
  id: bigserial("id", { mode: "number" }).primaryKey(),
  isMultiDay: boolean("is_multi_day").default(false),
  name: text("name").notNull(),
  parentBookingId: integer("parent_booking_id"),
  phone: text("phone").notNull(),
  purpose: text("purpose").notNull(),
  roomId: uuid("room_id").references(() => rooms.id),
  roomName: text("room_name").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  status: text("status").default("pending").notNull(),
  userId: uuid("user_id").references(() => authUsers.id, {
    onDelete: "set null",
  }),
});

export const profiles = pgTable("profiles", {
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  email: varchar("email"),
  fullName: text("full_name"),
  id: uuid("id")
    .primaryKey()
    .notNull()
    .references(() => authUsers.id),
  phone: text("phone"),
  role: text("role").default("user"),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  username: text("username").unique(),
  website: text("website"),
});

export const rooms = pgTable("rooms", {
  approvalRequired: boolean("approval_required").default(false),
  approvers: text("approvers").array(),
  availability: boolean("availability").default(true),
  availableTo: text("available_to"),
  capacity: integer("capacity").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  dependencyGroup: text("dependency_group"),
  description: text("description"),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  image: text("image"),
  name: varchar("name", { length: 255 }).notNull(),
});

export const unavailablePeriods = pgTable("unavailable_periods", {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  reason: text("reason").notNull(),
  roomId: uuid("room_id")
    .notNull()
    .references(() => rooms.id, {
      onDelete: "cascade",
    }),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
});

export const bookingDays = pgTable("booking_days", {
  bookingId: integer("booking_id")
    .references(() => bookings.id, {
      onDelete: "cascade",
    })
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  dayType: text("day_type").notNull(),
  endTime: timestamp("end_time", { withTimezone: true }),
  eventId: text("event_id"),
  id: uuid("id").primaryKey().defaultRandom(),
  isAllDay: boolean("is_all_day").default(false),
  startTime: timestamp("start_time", { withTimezone: true }),
});

export type BookingDays = InferSelectModel<typeof bookingDays>;
export type Bookings = InferSelectModel<typeof bookings>;
export type Rooms = InferSelectModel<typeof rooms>;
