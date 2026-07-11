const test = require('node:test');
const assert = require('node:assert/strict');
const { parseOrigins } = require('../config/runtime');

test('parseOrigins trims values and removes trailing slashes', () => {
  assert.deepEqual(
    parseOrigins(' https://app.example.edu/ , http://localhost:5173 '),
    ['https://app.example.edu', 'http://localhost:5173']
  );
});

test('parseOrigins returns no entries for an empty value', () => {
  assert.deepEqual(parseOrigins(''), []);
  assert.deepEqual(parseOrigins(undefined), []);
});
