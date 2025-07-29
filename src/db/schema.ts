import { InferSelectModel } from "drizzle-orm";
import { bigserial, boolean, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core"

export const authUsers = pgTable('auth.users', {
  id: uuid('id').primaryKey(),
});

export const bookings = pgTable('bookings', {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  email: text('email').notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  eventId: text('event_id'),
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  purpose: text('purpose').notNull(),
  roomId: uuid('room_id').references(() => rooms.id), 
  roomName: text('room_name').notNull(),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  status: text('status').default('pending').notNull(),
  userId: uuid('user_id').references(() => authUsers.id, {
    onDelete: 'set null',
  }),
})

export const profiles = pgTable('profiles', {
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  email: varchar('email'),
  fullName: text('full_name'),
  id: uuid('id').primaryKey().notNull()
    .references(() => authUsers.id), 
  role: text('role').default('user'),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  username: text('username').unique(),
  website: text('website'),
})

export const rooms = pgTable('rooms', {
  approvalRequired: boolean('approval_required').default(false),
  approvers: text('approvers').array(),
  availability: boolean('availability').default(true),
  availableTo: text('available_to'),
  capacity: integer('capacity').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  description: text('description'),
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  image: text('image'),
  name: varchar('name', { length: 255 }).notNull(),
})

export const unavailablePeriods = pgTable('unavailable_periods', {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  reason: text('reason').notNull(),
  roomId: uuid('room_id').notNull().references(() => rooms.id, {
    onDelete: 'cascade',
  }),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
})

export type Bookings = InferSelectModel<typeof bookings>;
export type Rooms = InferSelectModel<typeof rooms>;