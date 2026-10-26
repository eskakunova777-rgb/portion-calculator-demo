// Расчёт без интерфейса: одна функция для страницы, тестов и будущего бота.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PortionCalc = factory();
})(this, function () {
  function clampInt(v, min, max, fallback) {
    var n = parseInt(v, 10);
    if (isNaN(n)) n = fallback;
    return Math.min(max, Math.max(min, n));
  }

  // Приводит любой ввод (форма, ссылка, сообщение в боте) к допустимым значениям
  function normalize(input, data) {
    var p = input.program in data.programs ? input.program : 'classic';
    var meals = String(input.meals) === '3' ? 3 : 5;
    var adults = clampInt(input.adults, 0, data.limits.people, 2);
    var kids = clampInt(input.kids, 0, data.limits.people - adults, 0);
    if (adults + kids === 0) adults = 1;
    var days = clampInt(input.days, 1, data.limits.days, 7);
    return { program: p, meals: meals, adults: adults, kids: kids, days: days };
  }

  function calculate(input, data) {
    var q = normalize(input, data);
    var prog = data.programs[q.program];
    var adultPrice = prog.price[q.meals];
    var kidPrice = Math.round(adultPrice * data.kidFactor);
    var people = q.adults + q.kids;

    var subtotal = (adultPrice * q.adults + kidPrice * q.kids) * q.days;
    var discountPercent = 0;
    for (var i = 0; i < data.discounts.length; i++) {
      if (q.days >= data.discounts[i].fromDays) {
        discountPercent = Math.max(discountPercent, data.discounts[i].percent);
      }
    }
    var discount = Math.round(subtotal * discountPercent / 100);
    var total = subtotal - discount;

    var slots = data.meals[q.meals];
    var kcalPerDay = 0;
    var menuDays = [];
    for (var d = 0; d < q.days; d++) {
      var dayMenu = prog.menu[d % prog.menu.length];   // меню повторяется по кругу каждые 7 дней
      var dishes = slots.map(function (slot) {
        return { meal: slot, mealName: data.mealNames[slot], name: dayMenu[slot][0], kcal: dayMenu[slot][1] };
      });
      var dayKcal = dishes.reduce(function (s, x) { return s + x.kcal; }, 0);
      kcalPerDay += dayKcal;
      menuDays.push({ day: d + 1, kcal: dayKcal, dishes: dishes });
    }

    return {
      input: q,
      programName: prog.name,
      adultPrice: adultPrice,
      kidPrice: kidPrice,
      subtotal: subtotal,
      discountPercent: discountPercent,
      discount: discount,
      total: total,
      perDay: Math.round(total / q.days),
      perPersonDay: Math.round(total / q.days / people),
      portions: {
        perDay: people * q.meals,
        total: people * q.meals * q.days,
        adults: q.adults * q.meals * q.days,
        kids: q.kids * q.meals * q.days
      },
      avgKcal: Math.round(kcalPerDay / q.days),
      deliveries: Math.ceil(q.days / data.deliveryEveryDays),
      days: menuDays
    };
  }

  function money(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
  }

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  function peopleText(q) {
    var parts = [];
    if (q.adults) parts.push(q.adults + ' ' + plural(q.adults, 'взрослый', 'взрослых', 'взрослых'));
    if (q.kids) parts.push(q.kids + ' ' + plural(q.kids, 'ребёнок', 'ребёнка', 'детей'));
    return parts.join(' и ');
  }

  // Короткий текст расчёта: для кнопки «Скопировать» и для ответа бота
  function formatText(r) {
    var q = r.input;
    var lines = [
      'Рацион ' + r.programName + ', ' + q.meals + ' ' + plural(q.meals, 'приём', 'приёма', 'приёмов') + ' пищи',
      peopleText(q) + ', ' + q.days + ' ' + plural(q.days, 'день', 'дня', 'дней'),
      'Порций: ' + r.portions.total + ' (' + r.portions.perDay + ' в день)',
      r.discountPercent ? 'Скидка ' + r.discountPercent + '%: −' + money(r.discount) : null,
      'Итого: ' + money(r.total) + ' (' + money(r.perDay) + ' в день)',
      'Доставок: ' + r.deliveries + ', привозим вечером на 2 дня вперёд'
    ];
    return lines.filter(Boolean).join('\n');
  }

  return { normalize: normalize, calculate: calculate, formatText: formatText, money: money, plural: plural, peopleText: peopleText };
});
