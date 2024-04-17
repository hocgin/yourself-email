#!/usr/bin/env bash
DB_NAME=yourself-email

wrangler d1 export $DB_NAME --remote --output ./remote.sql
