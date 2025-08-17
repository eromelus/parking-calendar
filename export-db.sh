#!/bin/bash

echo "Exporting local database..."

# Export schema and data separately for better control
echo "1. Exporting database schema..."
npx prisma db pull
npx prisma generate

echo "2. Creating data backup..."
# You'll need to replace these with your local MySQL credentials
read -p "Enter your local MySQL username (default: root): " username
username=${username:-root}

read -s -p "Enter your local MySQL password: " password
echo

read -p "Enter your database name (default: parking_calendar): " dbname
dbname=${dbname:-parking_calendar}

echo "Exporting data to backup.sql..."
mysqldump -u "$username" -p"$password" "$dbname" --no-create-info --insert-ignore > data-backup.sql

echo "Export complete! Files created:"
echo "- schema.prisma (schema)"
echo "- data-backup.sql (data)"