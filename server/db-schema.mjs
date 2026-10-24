// Drizzle declarations for application-owned tables; Better Auth owns its core tables.
import {sqliteTable,text,integer,uniqueIndex} from 'drizzle-orm/sqlite-core';
export const journals=sqliteTable('journals',{userId:text('user_id').primaryKey(),revision:integer('revision').notNull().default(0),document:text('document').notNull(),updatedAt:text('updated_at').notNull()});
export const assets=sqliteTable('assets',{id:text('id').primaryKey(),userId:text('user_id').notNull(),path:text('path').notNull(),storageKey:text('storage_key').notNull().unique(),contentType:text('content_type').notNull(),size:integer('size').notNull(),digest:text('digest').notNull(),createdAt:text('created_at').notNull()},table=>[uniqueIndex('assets_owner_path').on(table.userId,table.path)]);
