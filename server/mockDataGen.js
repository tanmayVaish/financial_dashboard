const fs = require('fs');
const faker = require('faker');
const bcrypt = require('bcryptjs');

const generateUsersCSV = (numUsers = 50) => {
  const users = [];
  for (let i = 1; i <= numUsers; i++) {
    const email = faker.internet.email();
    const password = bcrypt.hashSync('password123', 10); // Dummy password for hashing
    users.push({ id: i, email, password });
  }

  const csvContent = users.map(u => `${u.id},${u.email},${u.password}`).join('\n');
  fs.writeFileSync('users.csv', `id,email,password\n${csvContent}`);
};

const generateTransactionsCSV = (numTransactions = 60) => {
  const transactions = [];
  const types = ['credit', 'debit'];
  const statuses = ['successful', 'pending', 'failed'];
  
  for (let i = 1; i <= numTransactions - 10; i++) {
    const type = faker.random.arrayElement(types);
    const amount = faker.finance.amount(10, 500, 2); // Amount between 10 and 500
    const status = faker.random.arrayElement(statuses);
    const createdAt = faker.date.past(1).toISOString(); // Random date within the past year
    transactions.push({ id: i, type, amount, status, createdAt });
  }

  // Add recent transactions
  for (let i = numTransactions - 9; i <= numTransactions; i++) {
    const type = faker.random.arrayElement(types);
    const amount = faker.finance.amount(10, 500, 2);
    const status = faker.random.arrayElement(statuses);
    const createdAt = faker.date.recent(7).toISOString(); // Random date within the last week
    transactions.push({ id: i, type, amount, status, createdAt });
  }

  const csvContent = transactions.map(t => `${t.id},${t.type},${t.amount},${t.status},${t.createdAt}`).join('\n');
  fs.writeFileSync('transactions.csv', `id,type,amount,status,createdAt\n${csvContent}`);
};

// Generate CSV files
generateUsersCSV(50);
generateTransactionsCSV(60);