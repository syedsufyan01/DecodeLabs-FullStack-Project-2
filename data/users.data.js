'use strict';

/**
 * In-memory data store (no database).
 * Data is reset every time the server restarts.
 * Controllers use these functions and never touch the array directly.
 */
const SEED_USERS = [
  { id: 101, name: 'John Doe', email: 'john@example.com', role: 'user' },
  { id: 102, name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
  { id: 103, name: 'Admin User', email: 'admin@example.com', role: 'admin' },
];

let users = [];
let nextId = 104;

function resetStore() {
  users = SEED_USERS.map((user) => ({ ...user }));
  nextId = 104;
}

resetStore();

const findAll = () => users.map((user) => ({ ...user }));

const findById = (id) => {
  const user = users.find((item) => item.id === id);
  return user ? { ...user } : null;
};

const findByEmail = (email) => {
  const user = users.find((item) => item.email === email);
  return user ? { ...user } : null;
};

function create({ name, email }) {
  // "role" is controlled by the server, never by the client.
  const user = { id: nextId, name, email, role: 'user' };
  nextId += 1;
  users.push(user);
  return { ...user };
}

function replace(id, { name, email }) {
  const index = users.findIndex((item) => item.id === id);
  if (index === -1) {
    return null;
  }
  // PUT replaces the client-editable fields; id and role stay under server control.
  users[index] = { id, name, email, role: users[index].role };
  return { ...users[index] };
}

function remove(id) {
  const index = users.findIndex((item) => item.id === id);
  if (index === -1) {
    return false;
  }
  users.splice(index, 1);
  return true;
}

module.exports = { resetStore, findAll, findById, findByEmail, create, replace, remove };
