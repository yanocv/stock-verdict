import { describe, it, expect } from 'vitest';
import { parseJgbTenYear } from './macroService';

// Shape of the Ministry of Finance CSV after Shift_JIS decoding
const CSV = [
  '国債金利情報 (令和8年10月),,,,,,,,,,,,,,,(単位 : %)',
  '基準日,1年,2年,3年,4年,5年,6年,7年,8年,9年,10年,15年,20年,25年,30年,40年',
  'R8.10.21,1.657,1.914,2.032,2.188,2.309,2.407,2.518,2.667,2.792,2.923,3.451,3.726,4.008,3.98,3.994',
  'R8.10.22,1.66,1.914,2.028,2.184,2.304,2.399,2.508,2.659,2.785,2.914,3.438,3.707,3.985,3.952,3.959',
  ',,,,,,,,,,,,,,,',
  '※最新のcsvデータがダウンロードできない場合…,,,,,,,,,,,,,,,',
].join('\r\n');

describe('parseJgbTenYear', () => {
  it('reads the 10-year column of the latest day', () => {
    expect(parseJgbTenYear(CSV)).toBe(2.914);
  });

  it('skips a latest row with no 10-year value', () => {
    expect(parseJgbTenYear(`${CSV}\r\nR8.10.23,1.6,,,,,,,,,-,,,,,`)).toBe(2.914);
    expect(parseJgbTenYear(`${CSV}\r\nR8.10.23,1.6,,,,,,,,,,,,,,`)).toBe(2.914);
  });

  it('returns null when there are no data rows', () => {
    expect(parseJgbTenYear('基準日,1年,2年\r\n,,')).toBeNull();
  });
});
