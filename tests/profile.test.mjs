import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateNickname, validateBirthday, randomNickname, isBirthdayToday, ageOn, parseBirthday, levelOf, botDifficulty,
} from '../js/profile.js';

test('fun nicknames are accepted', () => {
  for (const n of ['ShadowFox99', 'TurboCamel', 'xX_Bonk_Xx', 'Slipper123']) {
    assert.equal(validateNickname(n), '', n);
  }
});

test('real names are rejected', () => {
  for (const n of ['Amir', 'amir2017', 'Osama', 'Mohammed7', 'Sara', 'Ali', 'TheAmir', 'Alhuzebi']) {
    assert.match(validateNickname(n), /real name/, n);
  }
});

test('first and last names with spaces are rejected', () => {
  assert.match(validateNickname('Amir Alhuzebi'), /No spaces/);
});

test('bad nickname shapes are rejected', () => {
  assert.notEqual(validateNickname(''), '');
  assert.notEqual(validateNickname('ab'), '');
  assert.notEqual(validateNickname('a'.repeat(17)), '');
  assert.notEqual(validateNickname('Fox!'), '');
});

test('every random nickname combination passes validation', () => {
  // randomNickname picks adjective, animal and a number from rand(); walk all combos.
  for (let a = 0; a < 12; a++) {
    for (let b = 0; b < 12; b++) {
      const seq = [(a + 0.5) / 12, (b + 0.5) / 12, 0.5];
      let i = 0;
      const name = randomNickname(() => seq[i++]);
      assert.equal(validateNickname(name), '', name);
    }
  }
});

test('birthday checks', () => {
  const today = new Date(2026, 9, 7);
  assert.equal(validateBirthday('2017-05-20', today), '');
  assert.notEqual(validateBirthday('', today), '');
  assert.notEqual(validateBirthday('2027-01-01', today), '');
  assert.notEqual(validateBirthday('2025-01-01', today), '');
  assert.notEqual(validateBirthday('2017-02-30', today), '');
});

test('age and birthday-today helpers', () => {
  const today = new Date(2026, 9, 7);
  assert.equal(ageOn(parseBirthday('2017-10-08'), today), 8);
  assert.equal(ageOn(parseBirthday('2017-10-07'), today), 9);
  assert.equal(isBirthdayToday('2017-10-07', today), true);
  assert.equal(isBirthdayToday('2017-10-08', today), false);
});

test('bots get harder as the player levels up', () => {
  assert.equal(levelOf({ totalTags: 0 }), 1);
  assert.ok(levelOf({ totalTags: 100 }) > 1);
  assert.ok(botDifficulty({ totalTags: 100 }) > botDifficulty({ totalTags: 0 }));
  assert.ok(botDifficulty({ totalTags: 100000 }) <= 1);
});
