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

// Forward Cmd/Ctrl+K to Asyar launcher to open the action panel
window.addEventListener('keydown', (event) => {
  const isModifierCombo = event.metaKey || event.ctrlKey;
  if (isModifierCombo && event.key.toLowerCase() === 'k') {
    window.parent.postMessage(
      {
        type: 'asyar:extension:keydown',
        payload: {
          key: event.key,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
        },
      },
      '*',
    );
  }
});

window.parent.postMessage({ type: 'asyar:extension:loaded', extensionId }, '*');

const viewName = new URLSearchParams(window.location.search).get('view');
const initialTab: 'cep' | 'tracking' =
  viewName === 'track-package' || viewName === 'TrackingView' ? 'tracking' : 'cep';

const app = mount(App, {
  target: document.getElementById('app')!,
  props: {
    context,
    logger: context.getService<ILogService>('log'),
    initialTab,
  },
});

export default app;
