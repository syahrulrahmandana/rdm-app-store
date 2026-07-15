const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const statements = [
  `CREATE TABLE IF NOT EXISTS "User" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL, "password" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'KASIR', "avatar" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Store" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL DEFAULT 'RDM APP STORE', "address" TEXT, "phone" TEXT, "logo" TEXT, "taxRate" REAL NOT NULL DEFAULT 0, "receiptPrefix" TEXT NOT NULL DEFAULT 'RDM', "receiptFooter" TEXT DEFAULT 'Terima kasih atas kunjungan Anda!', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Category" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "description" TEXT, "icon" TEXT DEFAULT '📦', "color" TEXT DEFAULT '#3B82F6', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Product" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "sku" TEXT NOT NULL, "barcode" TEXT, "categoryId" TEXT, "buyPrice" REAL NOT NULL DEFAULT 0, "sellPrice" REAL NOT NULL DEFAULT 0, "image" TEXT, "minStock" INTEGER NOT NULL DEFAULT 5, "unit" TEXT NOT NULL DEFAULT 'pcs', "stock" INTEGER NOT NULL DEFAULT 0, "isActive" BOOLEAN NOT NULL DEFAULT true, "manageStock" BOOLEAN NOT NULL DEFAULT true, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "Transaction" ("id" TEXT NOT NULL PRIMARY KEY, "receiptNo" TEXT NOT NULL, "customerId" TEXT, "userId" TEXT NOT NULL, "subtotal" REAL NOT NULL DEFAULT 0, "discount" REAL NOT NULL DEFAULT 0, "discountType" TEXT NOT NULL DEFAULT 'nominal', "tax" REAL NOT NULL DEFAULT 0, "total" REAL NOT NULL DEFAULT 0, "paymentMethod" TEXT NOT NULL DEFAULT 'CASH', "paymentAmount" REAL NOT NULL DEFAULT 0, "changeAmount" REAL NOT NULL DEFAULT 0, "note" TEXT, "status" TEXT NOT NULL DEFAULT 'COMPLETED', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "Transaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE, CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "TransactionItem" ("id" TEXT NOT NULL PRIMARY KEY, "transactionId" TEXT NOT NULL, "productId" TEXT NOT NULL, "productName" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "price" REAL NOT NULL, "discount" REAL NOT NULL DEFAULT 0, "subtotal" REAL NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "TransactionItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "TransactionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "StockMovement" ("id" TEXT NOT NULL PRIMARY KEY, "productId" TEXT NOT NULL, "type" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "note" TEXT, "reference" TEXT, "userId" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "Customer" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "phone" TEXT, "email" TEXT, "address" TEXT, "points" INTEGER NOT NULL DEFAULT 0, "memberSince" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "CustomerDebt" ("id" TEXT NOT NULL PRIMARY KEY, "customerId" TEXT NOT NULL, "transactionId" TEXT, "amount" REAL NOT NULL, "paidAmount" REAL NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'UNPAID', "note" TEXT, "dueDate" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "CustomerDebt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "Supplier" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "phone" TEXT, "email" TEXT, "address" TEXT, "company" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Purchase" ("id" TEXT NOT NULL PRIMARY KEY, "supplierId" TEXT NOT NULL, "invoiceNo" TEXT, "totalAmount" REAL NOT NULL DEFAULT 0, "paidAmount" REAL NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'COMPLETED', "note" TEXT, "userId" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "Purchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "PurchaseItem" ("id" TEXT NOT NULL PRIMARY KEY, "purchaseId" TEXT NOT NULL, "productId" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "price" REAL NOT NULL, "subtotal" REAL NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "PurchaseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "ActivityLog" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "action" TEXT NOT NULL, "detail" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "CashRegister" ("id" TEXT NOT NULL PRIMARY KEY, "openAmount" REAL NOT NULL DEFAULT 0, "closeAmount" REAL, "userId" TEXT NOT NULL, "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "closedAt" DATETIME, CONSTRAINT "CashRegister_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Product_sku_key" ON "Product"("sku")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Product_barcode_key" ON "Product"("barcode")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_receiptNo_key" ON "Transaction"("receiptNo")`,
];

async function main() {
  console.log('🚀 Pushing schema to Turso...');
  console.log('📡 URL:', process.env.TURSO_DATABASE_URL);
  
  for (const sql of statements) {
    const tableName = sql.match(/"(\w+)"/)?.[1] || 'index';
    try {
      await client.execute(sql);
      console.log(`✅ Created: ${tableName}`);
    } catch (err) {
      console.error(`❌ Error creating ${tableName}:`, err.message);
    }
  }
  
  console.log('\n🎉 Schema push completed!');
}

main().catch(console.error);
