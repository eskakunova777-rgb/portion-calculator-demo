// Проверка расчёта без браузера: node test.js
const assert = require('assert');
const D = require('./data.js');
const C = require('./calc.js');

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok  ', name); }

test('семья 2+1, Classic, 5 приёмов, 7 дней', () => {
  const r = C.calculate({ program: 'classic', adults: 2, kids: 1, days: 7, meals: 5 }, D);
  assert.strictEqual(r.kidPrice, 1113);                       // 1590 × 0.7
  assert.strictEqual(r.subtotal, (1590 * 2 + 1113) * 7);      // 30 051
  assert.strictEqual(r.discountPercent, 5);
  assert.strictEqual(r.total, 30051 - 1503);
  assert.strictEqual(r.portions.total, 3 * 5 * 7);
  assert.strictEqual(r.portions.kids, 35);
  assert.strictEqual(r.deliveries, 4);
});

test('без скидки до 7 дней, скидка 10% от 14', () => {
  assert.strictEqual(C.calculate({ program: 'vegan', adults: 1, days: 6, meals: 3 }, D).discountPercent, 0);
  const r = C.calculate({ program: 'vegan', adults: 1, days: 14, meals: 3 }, D);
  assert.strictEqual(r.discountPercent, 10);
  assert.strictEqual(r.total, 1250 * 14 - 1750);
});

test('3 приёма: только завтрак, обед, ужин', () => {
  const r = C.calculate({ program: 'balance', adults: 1, days: 1, meals: 3 }, D);
  assert.deepStrictEqual(r.days[0].dishes.map(x => x.mealName), ['Завтрак', 'Обед', 'Ужин']);
});

test('меню повторяется по кругу на 8-й день', () => {
  const r = C.calculate({ program: 'classic', adults: 1, days: 8, meals: 5 }, D);
  assert.strictEqual(r.days.length, 8);
  assert.deepStrictEqual(r.days[7].dishes, r.days[0].dishes);
});

test('плохой ввод приводится к допустимому', () => {
  assert.deepStrictEqual(C.normalize({ program: 'keto', adults: 'abc', kids: -3, days: 99, meals: 4 }, D),
    { program: 'classic', meals: 5, adults: 2, kids: 0, days: 14 });
  assert.deepStrictEqual(C.normalize({ adults: 0, kids: 0 }, D).adults, 1);
  const q = C.normalize({ adults: 8, kids: 5 }, D);
  assert.strictEqual(q.adults + q.kids, D.limits.people);
});

test('в каждой программе 7 дней и все блюда на месте', () => {
  for (const p of Object.values(D.programs)) {
    assert.strictEqual(p.menu.length, 7);
    for (const day of p.menu) for (const slot of D.meals[5]) assert.ok(day[slot] && day[slot][1] > 0, p.name + ' ' + slot);
  }
});

test('текст для бота', () => {
  const t = C.formatText(C.calculate({ program: 'classic', adults: 2, kids: 1, days: 7, meals: 5 }, D));
  assert.ok(t.includes('2 взрослых и 1 ребёнок, 7 дней'));
  assert.ok(t.includes('Порций: 105'));
  assert.ok(t.includes('Скидка 5%'));
});

console.log(`\n${passed} проверок пройдено`);
