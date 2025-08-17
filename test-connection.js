const mysql = require('mysql2/promise')

async function testConnection() {
  // Parse DATABASE_URL from .env
  require('dotenv').config()
  
  const databaseUrl = process.env.DATABASE_URL
  console.log('Testing connection to:', databaseUrl.replace(/:[^:@]*@/, ':****@'))
  
  try {
    // Parse the connection string
    const url = new URL(databaseUrl)
    
    const connection = await mysql.createConnection({
      host: url.hostname,
      port: url.port || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.substring(1), // Remove leading slash
      connectTimeout: 10000
    })
    
    console.log('✅ Successfully connected to RDS!')
    
    // Test a simple query
    const [rows] = await connection.execute('SELECT 1 as test')
    console.log('✅ Query test successful:', rows)
    
    await connection.end()
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   → Check security group allows port 3306 from your IP')
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   → Check username/password in DATABASE_URL')
    } else if (error.code === 'ENOTFOUND') {
      console.error('   → Check RDS endpoint address')
    }
  }
}

testConnection()