import 'asyar-sdk/tokens.css';
import { mount } from 'svelte';
import {
  ExtensionContext,
  extensionBridge,
  registerIconElement,
  type ILogService,
} from 'asyar-sdk/view';
import type { Extension } from 'asyar-sdk/contracts';
import manifest from '../manifest.json';
import App from './views/App.svelte';

class CorreiosExtension implements Extension {
  async initialize(_ctx: ExtensionContext): Promise<void> {}
  async activate(): Promise<void> {}
  async deactivate(): Promise<void> {}

  async executeCommand(commandId: string): Promise<unknown> {
    return { type: 'view', viewPath: `com.matrikzin.correios-cep/${commandId}` };
  }

  onUnload = (): void => {};
}

const extensionId =
  window.location.hostname === 'localhost' ||
  window.location.hostname === 'asyar-extension.localhost'
    ? window.location.pathname.split('/').filter(Boolean)[0] || 'com.matrikzin.correios-cep'
    : window.location.hostname || 'com.matrikzin.correios-cep';

const context = new ExtensionContext();
context.setExtensionId(extensionId);
registerIconElement();

const impl = new CorreiosExtension();
extensionBridge.registerManifest(manifest as never);
extensionBridge.registerExtensionImplementation(extensionId, impl);

window.parent.postMessage({ type: 'asyar:extension:loaded', extensionId }, '*');

const app = mount(App, {
  target: document.getElementById('app')!,
  props: {
    context,
    logger: context.getService<ILogService>('log'),
  },
});

export default app;
