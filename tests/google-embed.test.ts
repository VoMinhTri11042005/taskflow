import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getGoogleEmbedUrl, getSafeExternalUrl } from '../src/lib/google-embed';

test('converts Google Workspace document links to previews', () => {
  const cases: Array<[string, string]> = [
    ['https://docs.google.com/document/d/doc-ID/edit?usp=sharing', 'https://docs.google.com/document/d/doc-ID/preview?usp=sharing'],
    ['https://docs.google.com/spreadsheets/d/sheet_ID/edit?gid=42#gid=42', 'https://docs.google.com/spreadsheets/d/sheet_ID/preview?gid=42#gid=42'],
    ['https://docs.google.com/presentation/d/slides-ID/edit', 'https://docs.google.com/presentation/d/slides-ID/preview'],
    ['https://docs.google.com/forms/d/e/form_ID/viewform', 'https://docs.google.com/forms/d/e/form_ID/viewform?embedded=true'],
    ['https://drive.google.com/file/d/file_ID/view?resourcekey=secret-key', 'https://drive.google.com/file/d/file_ID/preview?resourcekey=secret-key'],
    ['https://drive.google.com/open?id=file_ID&resourcekey=secret-key', 'https://drive.google.com/file/d/file_ID/preview?resourcekey=secret-key'],
    ['https://drive.google.com/open/?id=file-ID', 'https://drive.google.com/file/d/file-ID/preview'],
    ['https://docs.google.com/document/u/0/d/doc-ID/edit', 'https://docs.google.com/document/d/doc-ID/preview'],
    ['https://docs.google.com/document/d/doc-ID/mobilebasic?resourcekey=key', 'https://docs.google.com/document/d/doc-ID/preview?resourcekey=key'],
    ['https://docs.google.com/spreadsheets/d/sheet_ID/mobilebasic#gid=42', 'https://docs.google.com/spreadsheets/d/sheet_ID/preview#gid=42'],
    ['https://docs.google.com/presentation/u/0/d/slides-ID/mobilebasic', 'https://docs.google.com/presentation/d/slides-ID/preview'],
    ['https://docs.google.com/forms/d/e/form_ID/mobilebasic', 'https://docs.google.com/forms/d/e/form_ID/viewform?embedded=true'],
  ];

  for (const [input, expected] of cases) {
    assert.equal(getGoogleEmbedUrl(input), expected, input);
  }
});

test('converts published document links using their published IDs', () => {
  assert.equal(
    getGoogleEmbedUrl('https://docs.google.com/document/d/e/pub-id/pub'),
    'https://docs.google.com/document/d/e/pub-id/pub?embedded=true',
  );
  assert.equal(
    getGoogleEmbedUrl('https://docs.google.com/spreadsheets/d/e/pub-id/pubhtml?gid=7'),
    'https://docs.google.com/spreadsheets/d/e/pub-id/pubhtml?gid=7&embedded=true',
  );
  assert.equal(
    getGoogleEmbedUrl('https://docs.google.com/presentation/d/e/pub-id/pub?start=false'),
    'https://docs.google.com/presentation/d/e/pub-id/embed?start=false&embedded=true',
  );
});

test('rejects spoofed or unsupported sources for iframe embedding', () => {
  for (const input of [
    'https://docs.google.com.evil.example/document/d/id/edit',
    'https://docs.google.com@evil.example/document/d/id/edit',
    'https://evil.example/document/d/id/edit',
    'http://docs.google.com/document/d/id/edit',
    'https://docs.google.com:8443/document/d/id/edit',
    'https://docs.google.com/unknown/d/id/edit',
    'https://docs.google.com/document/d/id/mobilebasic/extra',
    'javascript:alert(1)',
    'data:text/html,hello',
    'https://forms.gle/shortID',
    'https://drive.google.com/open?id=',
    'https://drive.google.com/open?id=file%2Fother',
    'https://drive.google.com/open?id=first&id=second',
    'https://drive.google.com/open?id=../file',
  ]) {
    assert.equal(getGoogleEmbedUrl(input), null, input);
  }
});

test('permits safe external fallback URLs and rejects dangerous URLs', () => {
  assert.equal(getSafeExternalUrl('https://forms.gle/shortID'), 'https://forms.gle/shortID');
  assert.equal(getSafeExternalUrl('http://example.com/path'), 'http://example.com/path');
  for (const input of [
    'javascript:alert(1)',
    'data:text/html,hello',
    'https://user:password@example.com/',
    'https://user@example.com/',
    'not a URL',
  ]) {
    assert.equal(getSafeExternalUrl(input), null, input);
  }
});
