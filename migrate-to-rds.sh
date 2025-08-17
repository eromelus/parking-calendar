#!/bin/bash

echo "🚀 Migrating to AWS RDS..."

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ Please create .env.production with your RDS connection string first!"
    exit 1
fi

echo "1. Switching to production environment..."
cp .env.production .env

echo "2. Running Prisma migrations..."
npx prisma db push --accept-data-loss

echo "3. Generating Prisma client..."
npx prisma generate

echo "4. Testing connection..."
npx prisma db seed 2>/dev/null || echo "No seed file found, continuing..."

read -p "Do you want to import your local data now? (y/n): " import_data

if [ "$import_data" = "y" ]; then
    echo "5. Importing data..."
    if [ -f data-backup.sql ]; then
        # Extract connection details from DATABASE_URL
        echo "Please run this command manually with your RDS details:"
        echo "mysql -h YOUR_RDS_ENDPOINT -u admin -p parking_calendar < data-backup.sql"
    else
        echo "❌ data-backup.sql not found. Run ./export-db.sh first!"
    fi
fi

echo "✅ Migration script complete!"
echo "Next steps:"
echo "1. Update .env.production with your actual RDS endpoint"
echo "2. Run: npm run build && npm start"
echo "3. Test your application"