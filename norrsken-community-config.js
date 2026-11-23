// Founders offsite, two dates in January 2027. Edit only the numbers and dates below.
//   taken       how many founders have really registered per date (shows "n of 15 places taken" when above 0)
//   closed      set to true to close registration for everyone
//   dates       the label must match the tick box value on the page; closeAt is the last moment to register for that date
// Dates use the Spain time zone (+01:00 in winter).
window.JO = {
  max: 15,
  closed: false,
  earlyUntil: '2026-12-10T23:59:59+01:00',
  taken: { '7 and 8 January': 0, '28 and 29 January': 0 },
  dates: [
    { value: '7 and 8 January', closeAt: '2026-12-18T23:59:59+01:00' },
    { value: '28 and 29 January', closeAt: '2027-01-15T23:59:59+01:00' }
  ]
};
