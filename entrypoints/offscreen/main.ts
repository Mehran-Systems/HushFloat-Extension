import { AudioCommand, executeAudioCommandLocally } from '../../src/audio/audioBridge';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target === 'HUSH_OFFSCREEN' && message.cmd) {
    executeAudioCommandLocally(message.cmd as AudioCommand);
    sendResponse({ ok: true });
  }
  return false;
});
