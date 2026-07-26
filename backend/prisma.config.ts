import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' }); // Load from root

export default defineConfig({
  earlyAccess: true,
  migrate: {
    url: process.env.DATABASE_URL,
  }
});
