export const setupDOM = () => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    runScripts: 'dangerously',
  });
  global.document = dom.window.document;
  global.window = dom.window;
  global.navigator = dom.window.navigator;
  global.localStorage = dom.window.localStorage;
  global.MutationObserver = dom.window.MutationObserver;
  global.Request = dom.window.Request;
  global.Response = dom.window.Response;
};

export const cleanupDOM = () => {
  global.document = {};
  global.window = {};
  global.navigator = {};
  global.localStorage = {};
};