#!/bin/bash

# Alternative approach using Prisma migrate
# Run these commands in your terminal

echo "Creating migration for seller_products table..."
npx prisma migrate dev --name add-seller-products-table

echo "Generating Prisma client..."
npx prisma generate

echo "Checking migration status..."
npx prisma migrate status

echo "Done! The seller_products table should now exist in your database."