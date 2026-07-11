const test = require('node:test');
const assert = require('node:assert/strict');
const { isAllowedChatRoom, isValidArticleId } = require('../utils/socketRooms');

test('allows known category and valid tag chat rooms', () => {
  assert.equal(isAllowedChatRoom('category:news'), true);
  assert.equal(isAllowedChatRoom('category:know-your-past'), true);
  assert.equal(isAllowedChatRoom('tag:campus-life_2026'), true);
});

test('rejects unknown, malformed, and nested chat rooms', () => {
  assert.equal(isAllowedChatRoom('category:unknown'), false);
  assert.equal(isAllowedChatRoom('tag:invalid tag'), false);
  assert.equal(isAllowedChatRoom('category:news:admin'), false);
  assert.equal(isAllowedChatRoom(undefined), false);
});

test('only accepts MongoDB-shaped article identifiers', () => {
  assert.equal(isValidArticleId('507f1f77bcf86cd799439011'), true);
  assert.equal(isValidArticleId('not-an-id'), false);
  assert.equal(isValidArticleId('507f1f77bcf86cd799439011:admin'), false);
});
