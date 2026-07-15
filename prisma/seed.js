const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding default users and store configuration...')

  // Create Store
  const store = await prisma.store.upsert({
    where: { id: 'store-1' },
    update: {},
    create: {
      id: 'store-1',
      name: 'RDM APP STORE',
      address: 'Jl. Merdeka No. 123, Jakarta',
      phone: '08123456789',
      taxRate: 0,
      receiptPrefix: 'RDM',
      receiptFooter: 'Terima kasih telah berbelanja di RDM APP STORE!',
    },
  })
  console.log('✅ Store created:', store.name)

  // Create Users
  const hashedPassword = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@rdm.com' },
    update: {},
    create: {
      name: 'Admin RDM',
      email: 'admin@rdm.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  const kasir = await prisma.user.upsert({
    where: { email: 'kasir@rdm.com' },
    update: {},
    create: {
      name: 'Kasir 1',
      email: 'kasir@rdm.com',
      password: hashedPassword,
      role: 'KASIR',
    },
  })

  const owner = await prisma.user.upsert({
    where: { email: 'owner@rdm.com' },
    update: {},
    create: {
      name: 'Owner RDM',
      email: 'owner@rdm.com',
      password: hashedPassword,
      role: 'OWNER',
    },
  })
  console.log('✅ Users created: admin, kasir, owner (password: admin123)')

  console.log('\n🎉 Seeding completed! Database is clean and ready for manual input.')
  console.log('📧 Login credentials:')
  console.log('   Admin: admin@rdm.com / admin123')
  console.log('   Kasir: kasir@rdm.com / admin123')
  console.log('   Owner: owner@rdm.com / admin123')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
