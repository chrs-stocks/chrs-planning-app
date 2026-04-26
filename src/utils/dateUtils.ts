import { eachDayOfInterval, isSameDay, parseISO, format } from 'date-fns';

export const getDaysInMonth = (year: number, month: number): Date[] => {
  const date = new Date(year, month, 1);
  const days: Date[] = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
};

export const FRENCH_PUBLIC_HOLIDAYS: { [key: string]: string } = {
  '01-01': "Jour de l'An",
  '05-01': 'Fête du Travail',
  '05-08': 'Victoire 1945',
  '07-14': 'Fête Nationale',
  '08-15': 'Assomption',
  '11-01': 'Toussaint',
  '11-11': 'Armistice 1918',
  '12-25': 'Noël',
};

export const getEaster = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

export const isFrenchPublicHoliday = (date: Date): boolean => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const formattedDate = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  if (FRENCH_PUBLIC_HOLIDAYS[formattedDate]) {
    return true;
  }

  const easter = getEaster(year);
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);

  const ascension = new Date(easter);
  ascension.setDate(easter.getDate() + 39);

  const pentecost = new Date(easter);
  pentecost.setDate(easter.getDate() + 49);
  const pentecostMonday = new Date(pentecost);
  pentecostMonday.setDate(pentecost.getDate() + 1);

  return (
    isSameDay(date, easterMonday) ||
    isSameDay(date, ascension) ||
    isSameDay(date, pentecostMonday)
  );
};

export { format } from 'date-fns';

export const getFrenchSchoolHolidays = async (year: number, zone: string): Promise<Set<string>> => {
  const holidays = new Set<string>();
  const url = `https://data.education.gouv.fr/api/v2/catalog/datasets/fr-en-calendrier-scolaire/records?where=annee_scolaire%3D%22${year-1}-${year}%22%20and%20zones%3D%22${zone}%22&limit=100`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    
    data.records.forEach((record: { record: { fields: { start_date: string; end_date: string; }; }; }) => {
      const startDate = parseISO(record.record.fields.start_date);
      const apiEndDate = parseISO(record.record.fields.end_date);
      // Subtract one day from the API's end_date to make it inclusive of the last holiday day
      const endDate = new Date(apiEndDate.setDate(apiEndDate.getDate() - 1));
      const interval = { start: startDate, end: endDate };
      eachDayOfInterval(interval).forEach(day => {
        holidays.add(format(day, 'yyyy-MM-dd'));
      });
    });
  } catch (error) {
    console.error('Failed to fetch school holidays:', error);
  }

  return holidays;
};
